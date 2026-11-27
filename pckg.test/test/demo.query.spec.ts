/*
query           > [spaces] , [ shapedLogic | logic] , [spaces] ;
shapedLogic	    > shaped , [ logicRest ] ;
logic    		> singleWord , [ logicRest ] ;
logicRest		> space , [ Op0 , (shapedLogic | Op1) , logic ] ;
shaped          > ('(' , query , ')') | verbatim ;
Op1  			> [('AND' | 'OR') , [space]] ;
Op0 			> [('AND' | 'OR') , space] ;
verbatim        > '"' , [ allExceptQuote ] , '"' ;
singleWord      > nonSpecials , {specials , nonSpecials} ;
nonSpecials     > nonSpecial , {nonSpecial} ;
specials        > special , {special} ;
space 			> singleSpace , {singleSpace} ;
*/

import { match } from "@beeff/loose-match";
import {
  all,
  between,
  charExcept,
  charOneOf,
  complete,
  defer,
  first,
  optional,
  or,
  Parser,
  rep0,
  rep1,
  second,
} from "@beeff/tuco";

const opt = optional;

const toString = function (x: any) {
  if (typeof x === "string") return x;
  return x.join("");
};

const toWord = function (v: any) {
  return { kind: "word", value: toString(v) };
};

const toVerbatim = function (v: any) {
  return { kind: "verbatim", value: toString(v) };
};

const toOperator = function (v: any) {
  return { kind: v === null ? "AND" : v };
};

const toRightArg = function (v: any) {
  if (v === null) return v;

  const op = v[0];

  return { ...op, right: v[1] };
};

const toLeftArg = function (v: any) {
  if (v[1] === null) return v[0];

  const op = v[1];

  return { ...op, left: v[0] };
};

const spaceConst = " \u00A0,;\n\r\t";
const specialConst = '"()';

let shapedLogicImpl: Parser<any> = null!;
let logicImpl: Parser<any> = null!;
let queryImpl: Parser<any> = null!;

const shapedLogic = defer(() => shapedLogicImpl);
const logic = defer(() => logicImpl);
const query = defer(() => queryImpl);

const special = rep1(charOneOf(specialConst)).map(toString);
const space = rep1(charOneOf(spaceConst));
const nonSpecial = rep1(charExcept(spaceConst + specialConst)).map(toString);
const singleWord = all(nonSpecial, rep0(special, nonSpecial)).map(toWord);
const verbatim = between('"', rep0(charExcept('"')), '"').map(toVerbatim);
const shaped = or(between("(", query, ")"), verbatim);
// Operator precedence rests on the op0/op1 pair and the order of the
// alternatives in logicRest (below). After the left operand and a separating
// space, the right operand is recognized via one of two paths:
//
//   op0 = [AND|OR] + optional space  ->  right operand is shaped ('(...)' or '"..."')
//   op1 = [AND|OR] + required space  ->  right operand is an ordinary word
//
// A space is required only before a word: '(' and '"' are unambiguous delimiters,
// so 'AND(' and 'AND"..."' read as operator + shaped (no space needed), while
// 'AND word' needs the space — otherwise 'ANDfoo' stays one word. The order of
// the alternatives or(op0 + shapedLogic, op1 + logic) encodes that precedence.
const op0 = opt(first(or("AND", "OR"), opt(space))).map(toOperator);
const op1 = opt(first(or("AND", "OR"), space)).map(toOperator);
const logicRest = second(
  space,
  opt(or(all(op0, shapedLogic), all(op1, logic))),
).map(toRightArg);
shapedLogicImpl = all(shaped, opt(logicRest)).map(toLeftArg);
logicImpl = all(singleWord, opt(logicRest)).map(toLeftArg);
queryImpl = between(opt(space), opt(or(shapedLogic, logic)), opt(space));

const parseQuery = complete(query);

const buildClauses = function (result: any): any[] {
  if (result === null) return [];

  if (result.kind === "word" || result.kind === "verbatim")
    return [result.value];

  if (result.kind === "OR" || result.kind === "AND")
    return buildClauses(result.left).concat(buildClauses(result.right));

  throw new Error("wrong kind");
};

// Narrow a successful parse result down to its value; the guard is not a
// matcher, so a test that uses it still has exactly one `match(...).with(...)`.
const queryValue = function (text: string): any {
  const result = query(text);
  if ("failed" in result) throw new Error("expected success");
  return result.value;
};

describe("query", function () {
  it("big", function () {
    const result = query(
      'bamboo OR (join AND ")quted test laenin,()!" bbq) AND "" OR ncx AND pgt',
    );

    match(result).with({ rest: "" });
  });

  it("simple", function () {
    const result = query("x");

    match(result).with({
      value: {
        kind: "word",
        value: "x",
      },
      rest: "",
    });
  });

  it("simple with spaces", function () {
    const result = query(" x ");

    match(result).with({
      value: {
        kind: "word",
        value: "x",
      },
      rest: "",
    });
  });

  it("simple quoted", function () {
    const result = query('" x "');

    match(result).with({
      value: {
        kind: "verbatim",
        value: " x ",
      },
      rest: "",
    });
  });

  it("simple parenthesed", function () {
    const result = query(" ( x ) ");

    match(result).with({
      value: {
        kind: "word",
        value: "x",
      },
      rest: "",
    });
  });

  it("simple parenthesed no spaces", function () {
    const result = query("(x)");

    match(result).with({
      value: {
        kind: "word",
        value: "x",
      },
      rest: "",
    });
  });

  it("operator AND", function () {
    const result = query("x AND y");

    match(result).with({
      value: {
        kind: "AND",
        left: {
          kind: "word",
          value: "x",
        },
        right: {
          kind: "word",
          value: "y",
        },
      },
      rest: "",
    });
  });

  it("operator OR", function () {
    const result = query("x OR y");

    match(result).with({
      value: {
        kind: "OR",
        left: {
          kind: "word",
          value: "x",
        },
        right: {
          kind: "word",
          value: "y",
        },
      },
      rest: "",
    });
  });

  it("implicit operator AND", function () {
    const result = query("x  y");

    match(result).with({
      value: {
        kind: "AND",
        left: {
          kind: "word",
          value: "x",
        },
        right: {
          kind: "word",
          value: "y",
        },
      },
      rest: "",
    });
  });

  it("empty verbatim", function () {
    const result = query('""');

    match(result).with({
      value: {
        kind: "verbatim",
        value: "",
      },
      rest: "",
    });
  });

  it("empty parenthesises", function () {
    const result = query("()");

    match(result).with({
      value: null,
      rest: "",
    });
  });
});

describe("query errors", function () {
  it("dangling quote", function () {
    const result = parseQuery('"test');

    match(result).with({
      failed: true,
      pos: 0,
      expected: ["end of input"],
    });
  });

  it("dangling parenthesis", function () {
    const result = parseQuery("test (");

    match(result).with({
      failed: true,
      pos: 5,
      expected: ["end of input"],
    });
  });
});

describe("projections", function () {
  it("toRightArg returns a fresh operator", function () {
    const op = { kind: "AND" };
    const right = { kind: "word", value: "y" };

    const result = toRightArg([op, right]);

    match({ fresh: result !== op, opKeys: Object.keys(op), result }).with({
      fresh: true,
      opKeys: ["kind"],
      result: { kind: "AND", right: { kind: "word", value: "y" } },
    });
  });

  it("toLeftArg returns a fresh operator", function () {
    const op = { kind: "OR", right: { kind: "word", value: "y" } };
    const left = { kind: "word", value: "x" };

    const result = toLeftArg([left, op]);

    match({ fresh: result !== op, opKeys: Object.keys(op), result }).with({
      fresh: true,
      opKeys: ["kind", "right"],
      result: {
        kind: "OR",
        right: { kind: "word", value: "y" },
        left: { kind: "word", value: "x" },
      },
    });
  });
});

describe("build clauses", function () {
  it("single word", function () {
    const result = buildClauses(queryValue("test"));

    match(result).with(["test"]);
  });

  it("several word", function () {
    const result = buildClauses(queryValue("test1 test2 test3"));

    match(result.sort()).with(["test1", "test2", "test3"]);
  });

  it("several word and parenthesises", function () {
    const result = buildClauses(queryValue("test1 (test2 test3)"));

    match(result.sort()).with(["test1", "test2", "test3"]);
  });

  it("several word and parenthesises and verbatim", function () {
    const result = buildClauses(
      queryValue('test1 (test2 test3 AND "quoted string")'),
    );

    match(result.sort()).with(["quoted string", "test1", "test2", "test3"]);
  });

  it("null result gives no clauses", function () {
    const result = buildClauses(null);

    match(result).with([]);
  });
});
