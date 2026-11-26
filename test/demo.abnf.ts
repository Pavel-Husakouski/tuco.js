/*
Meta-demo: ABNF (RFC 5234) parsed by tuco itself.

`source` below is an ABNF grammar written in ABNF (core rules + ABNF-via-ABNF).
The `rulelist` parser is built from tuco combinators and turns `source` into an
AST, which the tests below check.

Deliberate simplifications (the parser accepts a little less than strict RFC 5234):
- a line break is accepted as both `\r\n` and `\n` (CRLF is not enforced);
- continuing a rule on the next (indented) line is not supported: inside a rule
  whitespace is only SP/HTAB, a line break ends the rule; comment lines between
  rules are skipped;
- the separator between repetitions in a concatenation is any number of SP/HTAB,
  including zero (the greedy `rulename` keeps two words from merging into one);
- ranges `%x..-..` / `%d..` / `%b..` are kept as a structure
  `{kind:'num', base, values, range}` rather than expanded into a character set;
- the body of char-val / prose-val / comments is not validated character-by-character
  against the RFC (anything except the separator and line break is taken).
*/

import { match, predicate } from '@beeff/loose-match';
import {
    all, between, charExcept, charIs, charMeets, charOneOf, first,
    optional, or, rep0, rep1, second, word
} from '../src/tuco.ts';

// Truthy check, used to assert that a rule name is present in the byName map.
const truthy = predicate(function(x){ return Boolean(x); });

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
const isAlpha  = function(c){ return /[A-Za-z]/.test(c); };
const isDigit  = function(c){ return /[0-9]/.test(c); };
const isHexdig = function(c){ return /[0-9A-Fa-f]/.test(c); };

const ALPHA  = charMeets(isAlpha, 'ALPHA');
const DIGIT  = charMeets(isDigit, 'DIGIT');
const HEXDIG = charMeets(isHexdig, 'HEXDIG');
const BIT    = charOneOf('01');
const SP     = charIs(' ');
const HTAB   = charIs('\t');
const WSP    = or(SP, HTAB);
const LF     = charIs('\n');
const CRLF   = or(word('\r\n'), LF);   // simplification: both \r\n and \n
const DQUOTE = charIs('"');

// ---- whitespace, line breaks, comments ----
const comment = all(charIs(';'), rep0(charExcept('\n')), CRLF);
const ws = rep0(WSP);                          // inline: spaces and tabs only
const spacing = rep0(or(WSP, CRLF, comment));  // full: spaces + line breaks + comments

function lex(p){ return first(p, ws); }   // parse p and skip trailing spaces/tabs

function join(xs){ return xs === null ? '' : xs.join(''); }

// ---- atomic tokens (each with trailing spacing) ----

// rulename = ALPHA *(ALPHA / DIGIT / "-")
const rulename = lex(all(ALPHA, rep0(or(ALPHA, DIGIT, charIs('-')))))
    .map(function(v){ return v[0] + (v[1] === null ? '' : v[1].join('')); });

// char-val = DQUOTE *(%x20-21 / %x23-7E) DQUOTE
const charVal = lex(between(DQUOTE, rep0(charExcept('"\n')).map(join), DQUOTE))
    .map(function(s){ return { kind:'char', value: s }; });

// prose-val = "<" *(%x20-3D / %x3F-7E) ">"
const proseVal = lex(between(charIs('<'), rep0(charExcept('>\n')).map(join), charIs('>')))
    .map(function(s){ return { kind:'prose', value: s }; });

// num-val = "%" (bin-val / dec-val / hex-val)
function numBody(digit){
    const d = rep1(digit).map(join);              // 1*DIGIT
    const range = second(charIs('-'), d);         // "-" 1*DIGIT
    const seq = rep1(second(charIs('.'), d));     // 1*("." 1*DIGIT)
    return all(d, optional(or(range, seq)));
}

function toNum(base){
    return function(body){
        // body = [first, tail], tail = string (range) | array (seq) | null
        const first = body[0], tail = body[1];
        let values, range = false;
        if(tail === null)
            values = [first];
        else if(typeof tail === 'string'){
            values = [first, tail]; range = true;
        } else
            values = [first].concat(tail);
        return { kind:'num', base: base, values: values, range: range };
    };
}

const numVal = lex(second(charIs('%'), or(
    second(charIs('b'), numBody(BIT)).map(toNum('b')),
    second(charIs('d'), numBody(DIGIT)).map(toNum('d')),
    second(charIs('x'), numBody(HEXDIG)).map(toNum('x'))
)));

// defined-as = *c-wsp ("=" / "=/") *c-wsp
const definedAs = lex(or(word('=/'), word('=')));

// ---- mutually recursive rules (forward declarations) ----
let alternationImpl: any = null;
const alternation   = function(x){ return alternationImpl(x); };
let concatenationImpl: any = null;
const concatenation = function(x){ return concatenationImpl(x); };
let repetitionImpl: any = null;
const repetition    = function(x){ return repetitionImpl(x); };
let elementImpl: any = null;
const element       = function(x){ return elementImpl(x); };
let groupImpl: any = null;
const group         = function(x){ return groupImpl(x); };
let optionImpl: any = null;
const option        = function(x){ return optionImpl(x); };

// repeat = 1*DIGIT / (*DIGIT "*" *DIGIT)
const repeat = or(
    all(rep0(DIGIT), charIs('*'), rep0(DIGIT)).map(function(v){
        return {
            min: v[0] === null ? 0 : parseInt(v[0].join(''), 10),
            max: v[2] === null ? Infinity : parseInt(v[2].join(''), 10)
        };
    }),
    rep1(DIGIT).map(function(ds){
        const n = parseInt(ds.join(''), 10);
        return { min: n, max: n };
    })
);

// group = "(" *c-wsp alternation *c-wsp ")"
groupImpl = lex(between(first(charIs('('), ws), alternation, charIs(')')))
    .map(function(alt){ return { kind:'group', alt: alt }; });

// option = "[" *c-wsp alternation *c-wsp "]"
optionImpl = lex(between(first(charIs('['), ws), alternation, charIs(']')))
    .map(function(alt){ return { kind:'option', alt: alt }; });

// element = rulename / group / option / char-val / num-val / prose-val
elementImpl = or(
    rulename.map(function(n){ return { kind:'rulename', name: n }; }),
    group, option, charVal, numVal, proseVal
);

// repetition = [repeat] element
repetitionImpl = all(optional(repeat), element)
    .map(function(v){ return { repeat: v[0], el: v[1] }; });

// concatenation = repetition *(1*c-wsp repetition)
concatenationImpl = rep1(repetition);

// alternation = concatenation *(*c-wsp "/" *c-wsp concatenation)
alternationImpl = all(concatenation, rep0(all(lex(charIs('/')), concatenation)))
    .map(function(v){
        const rest = v[1] === null ? [] : v[1].map(function(pair){ return pair[1]; });
        return [v[0]].concat(rest);
    });

// rule = rulename defined-as elements c-nl
const rule = all(rulename, definedAs, alternation, or(comment, CRLF))
    .map(function(v){ return { name: v[0], op: v[1], alt: v[2] }; });

// rulelist = 1*( rule / (*c-wsp c-nl) )
const rulelist = first(rep1(second(spacing, rule)), spacing);

// ---- tests ----
function byName(rules){
    const map: any = {};
    rules.forEach(function(r){ map[r.name] = r; });
    return map;
}

describe('abnf (meta-demo)', function(){
    let rules: any = null;   // the parsed rulelist(source) AST, shared across the tests

    it('parses the full ABNF self-description', function(){
        const result = rulelist(source);
        if ('failed' in result) throw new Error('expected success');
        match(result.rest).with('');
        rules = result.value;
    });

    it('collects core and meta rules by name', function(){
        const map = byName(rules);
        match(map).with({
            ALPHA: truthy, DIGIT: truthy, CRLF: truthy, WSP: truthy,
            rule: truthy, rulelist: truthy, alternation: truthy, concatenation: truthy, repetition: truthy,
            'char-val': truthy, 'num-val': truthy, 'prose-val': truthy
        });
    });

    it('parses CRLF as the concatenation CR LF', function(){
        const map = byName(rules);
        const crlf = map.CRLF.alt[0];
        match(crlf.map(function(r){ return r.el; })).with([
            { kind:'rulename', name:'CR' },
            { kind:'rulename', name:'LF' }
        ]);
    });

    it('parses a range repetition and a num-val', function(){
        const result = rulelist('x = 1*3DIGIT / %x41-5A\n');
        if ('failed' in result) throw new Error('expected success');
        const alt = result.value[0].alt;
        match([result.rest, alt[0][0].repeat, alt[1][0].el]).with([
            '',
            { min:1, max:3 },
            { kind:'num', base:'x', values:['41','5A'], range:true }
        ]);
    });

    it('parses group, option and prose-val', function(){
        const result = rulelist('x = (a / b) [c] <free text>\n');
        if ('failed' in result) throw new Error('expected success');
        const el = result.value[0].alt[0];
        match([result.rest, el.map(function(r){ return r.el.kind; })]).with(['', ['group', 'option', 'prose']]);
    });
});
