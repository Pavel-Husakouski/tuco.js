/*
Meta-demo: ABNF (RFC 5234) parsed by tuco itself.

`source` below is an ABNF grammar written in ABNF (core rules + ABNF-via-ABNF).
The `rulelist` parser is built from tuco combinators and turns `source` into an
AST, which the tests below check.

Deliberate simplifications (the parser accepts a little less than strict RFC 5234):
- a line break is accepted as both `\r\n` and `\n` (CRLF is not enforced);
- ranges `%x..-..` / `%d..` / `%b..` are kept as a structure
  `{kind:'num', base, values, range}` rather than expanded into a character set;
- the body of char-val / prose-val / comments is not validated character-by-character
  against the RFC (anything except the separator and line break is taken).
*/

import { match, predicate } from "@beeff/loose-match";
import {
  all,
  between,
  charExcept,
  charMeets,
  charOneOf,
  defer,
  first,
  optional,
  or,
  Parser,
  rep0,
  rep1,
  second,
} from "@beeff/tuco";

// Truthy check, used to assert that a rule name is present in the byName map.
const truthy = predicate(function (x) {
  return Boolean(x);
});

// ---- source: the ABNF grammar of ABNF (RFC 5234) ----
const source = `
ALPHA          =  %x41-5A / %x61-7A   ; A-Z / a-z
BIT            =  "0" / "1"
CHAR           =  %x01-7F            ; any 7-bit US-ASCII character except NUL
CR             =  %x0D               ; carriage return
CRLF           =  CR LF              ; standard newline
CTL            =  %x00-1F / %x7F     ; control characters
DIGIT          =  %x30-39            ; 0-9
DQUOTE         =  %x22               ; " (double quote)
HEXDIG         =  DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
HTAB           =  %x09               ; horizontal tab
LF             =  %x0A               ; linefeed
OCTET          =  %x00-FF            ; 8 bits of data
SP             =  %x20               ; space
VCHAR          =  %x21-7E            ; visible (printable) characters
WSP            =  SP / HTAB          ; whitespace: space or tab

rulelist       =  1*( rule / (*c-wsp c-nl) )

rule           =  rulename defined-as elements c-nl
               ; a rule continues if the next line starts with whitespace

rulename       =  ALPHA *(ALPHA / DIGIT / "-")

defined-as     =  *c-wsp ("=" / "=/") *c-wsp
               ; "=" — basic definition, "=/" — incremental alternative

elements       =  alternation *c-wsp

c-wsp          =  WSP / (c-nl WSP)   ; comment and/or whitespace

c-nl           =  comment / CRLF

comment        =  ";" *(WSP / VCHAR) CRLF

alternation    =  concatenation *(*c-wsp "/" *c-wsp concatenation)

concatenation  =  repetition *(1*c-wsp repetition)

repetition     =  [repeat] element

repeat         =  1*DIGIT / (*DIGIT "*" *DIGIT)
               ; 3 — exactly 3, *3 — 0..3, 1*3 — 1..3, * — 0..∞

element        =  rulename / group / option / char-val / num-val / prose-val

group          =  "(" *c-wsp alternation *c-wsp ")"

option         =  "[" *c-wsp alternation *c-wsp "]"   ; same as *1(...)

char-val       =  DQUOTE *(%x20-21 / %x23-7E) DQUOTE
               ; a string of SP and VCHAR without DQUOTE

num-val        =  "%" (bin-val / dec-val / hex-val)

bin-val        =  "b" 1*BIT [ 1*("." 1*BIT) / ("-" 1*BIT) ]

dec-val        =  "d" 1*DIGIT [ 1*("." 1*DIGIT) / ("-" 1*DIGIT) ]

hex-val        =  "x" 1*HEXDIG [ 1*("." 1*HEXDIG) / ("-" 1*HEXDIG) ]

prose-val      =  "<" *(%x20-3D / %x3F-7E) ">"
               ; prose description — last resort, in angle brackets
`;

// ---- basic character classes ----
const isAlpha = function (c: string) {
  return /[A-Za-z]/.test(c);
};
const isDigit = function (c: string) {
  return /[0-9]/.test(c);
};
const isHexdig = function (c: string) {
  return /[0-9A-Fa-f]/.test(c);
};

const ALPHA = charMeets(isAlpha, "ALPHA");
const DIGIT = charMeets(isDigit, "DIGIT");
const HEXDIG = charMeets(isHexdig, "HEXDIG");
const BIT = charOneOf("01");
const SP = " ";
const HTAB = "\t";
const WSP = or(SP, HTAB);
const LF = "\n";
const CRLF = or("\r\n", LF); // simplification: both \r\n and \n
const DQUOTE = '"';

// ---- whitespace, line breaks, comments ----
const comment = all(";", rep0(charExcept("\n")), CRLF);

const cNl = or(comment, CRLF); // c-nl = comment / CRLF
const cWsp = or(WSP, all(cNl, WSP)); // c-wsp = WSP / (c-nl WSP)
const join = function (xs: string[]) {
  return xs.join("");
};

// ---- 1* runs ----
const BITS = rep1(BIT).map(join); // 1*BIT
const DIGITS = rep1(DIGIT).map(join); // 1*DIGIT
const HEXDIGITS = rep1(HEXDIG).map(join); // 1*HEXDIG

// ---- atomic tokens ----

// rulename = ALPHA *(ALPHA / DIGIT / "-")
const rulename = all(ALPHA, rep0(or(ALPHA, DIGIT, "-"))).map(function (v) {
  return v[0] + v[1].join("");
});

// char-val = DQUOTE *(%x20-21 / %x23-7E) DQUOTE
const charVal = between(DQUOTE, rep0(charExcept('"\n')).map(join), DQUOTE).map(
  function (s) {
    return { kind: "char", value: s };
  },
);

// prose-val = "<" *(%x20-3D / %x3F-7E) ">"
const proseVal = between("<", rep0(charExcept(">\n")).map(join), ">").map(
  function (s) {
    return { kind: "prose", value: s };
  },
);

// num-val = "%" (bin-val / dec-val / hex-val)
const numBody = (digits: Parser<string>) => {
  const range = second("-", digits); // "-" 1*DIGIT
  const seq = rep1(second(".", digits)); // 1*("." 1*DIGIT)
  return all(digits, optional(or(range, seq)));
};

const toNum = function (base: string) {
  return function (body: any) {
    // body = [first, tail], tail = string (range) | array (seq) | null
    const first = body[0],
      tail = body[1];
    let values,
      range = false;
    if (tail === null) values = [first];
    else if (typeof tail === "string") {
      values = [first, tail];
      range = true;
    } else values = [first].concat(tail);
    return { kind: "num", base: base, values: values, range: range };
  };
};

const numVal = second(
  "%",
  or(
    second("b", numBody(BITS)).map(toNum("b")),
    second("d", numBody(DIGITS)).map(toNum("d")),
    second("x", numBody(HEXDIGITS)).map(toNum("x")),
  ),
);

// defined-as = *c-wsp ("=" / "=/") *c-wsp
const definedAs = between(rep0(cWsp), or("=/", "="), rep0(cWsp));

// ---- mutually recursive rules (forward declarations) ----
let alternationImpl: Parser<any> = null!;
const alternation = defer(() => alternationImpl);
let concatenationImpl: Parser<any> = null!;
const concatenation = defer(() => concatenationImpl);
let repetitionImpl: Parser<any> = null!;
const repetition = defer(() => repetitionImpl);
let elementImpl: Parser<any> = null!;
const element = defer(() => elementImpl);
let groupImpl: Parser<any> = null!;
const group = defer(() => groupImpl);
let optionImpl: Parser<any> = null!;
const option = defer(() => optionImpl);

// repeat = 1*DIGIT / (*DIGIT "*" *DIGIT)
const repeat = or(
  all(rep0(DIGIT), "*", rep0(DIGIT)).map(function (v) {
    return {
      min: v[0].length === 0 ? 0 : parseInt(v[0].join(""), 10),
      max: v[2].length === 0 ? Infinity : parseInt(v[2].join(""), 10),
    };
  }),
  DIGITS.map(function (s) {
    const n = parseInt(s, 10);
    return { min: n, max: n };
  }),
);

// group = "(" *c-wsp alternation *c-wsp ")"
groupImpl = between(
  first("(", rep0(cWsp)),
  alternation,
  second(rep0(cWsp), ")"),
).map(function (alt) {
  return { kind: "group", alt: alt };
});

// option = "[" *c-wsp alternation *c-wsp "]"
optionImpl = between(
  first("[", rep0(cWsp)),
  alternation,
  second(rep0(cWsp), "]"),
).map(function (alt) {
  return { kind: "option", alt: alt };
});

// element = rulename / group / option / char-val / num-val / prose-val
elementImpl = or(
  rulename.map(function (n) {
    return { kind: "rulename", name: n };
  }),
  group,
  option,
  charVal,
  numVal,
  proseVal,
);

// repetition = [repeat] element
repetitionImpl = all(optional(repeat), element).map(function (v) {
  return { repeat: v[0], el: v[1] };
});

// concatenation = repetition *(1*c-wsp repetition)
concatenationImpl = all(repetition, rep0(second(rep1(cWsp), repetition))).map(
  function (v) {
    return [v[0]].concat(v[1]);
  },
);

// alternation = concatenation *(*c-wsp "/" *c-wsp concatenation)
alternationImpl = all(
  concatenation,
  rep0(second(between(rep0(cWsp), "/", rep0(cWsp)), concatenation)),
).map(function (v) {
  return [v[0]].concat(v[1]);
});

// rule = rulename defined-as elements c-nl
const rule = all(rulename, definedAs, alternation, rep0(cWsp), cNl).map(
  function (v) {
    return { name: v[0], op: v[1], alt: v[2] };
  },
);

// rulelist = 1*( rule / (*c-wsp c-nl) )
const blankLine = second(rep0(cWsp), cNl).map(function () {
  return null;
});
const rulelist = first(rep1(or(rule, blankLine)), rep0(cWsp)).map(
  function (xs) {
    return xs.filter(function (x) {
      return x !== null;
    });
  },
);

// ---- tests ----
const byName = function (rules: any[]) {
  // Grammar-controlled names can be `__proto__` or `constructor`, so the
  // lookup must not inherit from Object.prototype: a plain `{}` would let
  // `__proto__` replace the prototype instead of creating a real key.
  const map: any = Object.create(null);
  rules.forEach(function (r: any) {
    map[r.name] = r;
  });
  return map;
};

// Parse the grammar once up front, so every test works independently of the
// execution order (a filtered or single-test run does not depend on an earlier `it`).
const parsedRulelist = rulelist(source);
if ("failed" in parsedRulelist) throw new Error("expected success");
const rules = parsedRulelist.value;

describe("abnf (meta-demo)", function () {
  it("parses the full ABNF self-description", function () {
    match(parsedRulelist).with({ rest: "" });
  });

  it("collects core and meta rules by name", function () {
    const map = byName(rules);
    match(map).with({
      ALPHA: truthy,
      DIGIT: truthy,
      CRLF: truthy,
      WSP: truthy,
      rule: truthy,
      rulelist: truthy,
      alternation: truthy,
      concatenation: truthy,
      repetition: truthy,
      "char-val": truthy,
      "num-val": truthy,
      "prose-val": truthy,
    });
  });

  it("keys rule names safely, even __proto__ and constructor", function () {
    const result = rulelist('constructor = "a"\n');
    if ("failed" in result) throw new Error("expected success");
    const map = byName([result.value[0], { name: "__proto__", alt: [] }]);
    match([
      map.constructor.name,
      map["__proto__"].name,
      Object.getPrototypeOf(map) === null,
      Object.prototype.hasOwnProperty.call(Object.prototype, "name"),
    ]).with(["constructor", "__proto__", true, false]);
  });

  it("parses CRLF as the concatenation CR LF", function () {
    const map = byName(rules);
    const crlf = map.CRLF.alt[0];
    match(
      crlf.map(function (r: any) {
        return r.el;
      }),
    ).with([
      { kind: "rulename", name: "CR" },
      { kind: "rulename", name: "LF" },
    ]);
  });

  it("parses a range repetition and a num-val", function () {
    const result = rulelist("x = 1*3DIGIT / %x41-5A\n");
    if ("failed" in result) throw new Error("expected success");
    const alt = result.value[0].alt;
    match([result.rest, alt[0][0].repeat, alt[1][0].el]).with([
      "",
      { min: 1, max: 3 },
      { kind: "num", base: "x", values: ["41", "5A"], range: true },
    ]);
  });

  it("parses group, option and prose-val", function () {
    const result = rulelist("x = (a / b) [c] <free text>\n");
    if ("failed" in result) throw new Error("expected success");
    const el = result.value[0].alt[0];
    match([
      result.rest,
      el.map(function (r: any) {
        return r.el.kind;
      }),
    ]).with(["", ["group", "option", "prose"]]);
  });
});
