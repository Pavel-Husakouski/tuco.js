/*
    expr   = add
    add    = mul { ('+' | '-') mul }             ; left-associative
    mul    = unary { ('*' | '/' | '%') unary }   ; left-associative
    unary  = '-' unary | power                   ; unary minus binds looser than ^
    power  = atom { '^' atom }                   ; right-associative
    atom   = number | variable | '(' expr ')'
    number = [0-9]+
    variable = [a-zA-Z][a-zA-Z0-9]*

    A chain `operand { op operand }` parses flat as `[head, [[op, operand], ...]]`
    and is folded in `.map` into `[op, a, b]` (operator first): left for add/mul,
    right for power.
*/

import { match } from "@beeff/loose-match";
import {
  all,
  between,
  charMeets,
  charOneOf,
  or,
  rep0,
  rep1,
} from "@beeff/tuco";

const number = rep1(charOneOf("0123456789")).map(function (x) {
  return parseInt(x.join(""));
});

const isLetter = function (c: string) {
  return /[a-zA-Z]/.test(c);
};
const isIdentChar = function (c: string) {
  return /[a-zA-Z0-9]/.test(c);
};
const ident = all(charMeets(isLetter), rep0(charMeets(isIdentChar))).map(
  function (v) {
    return v[0] + (v[1] === null ? "" : v[1].join(""));
  },
);

let exprImpl: any = null;
const expr = function (x: string | null) {
  return exprImpl(x);
};
let addImpl: any = null;
const add = function (x: string | null) {
  return addImpl(x);
};
let mulImpl: any = null;
const mul = function (x: string | null) {
  return mulImpl(x);
};
let unaryImpl: any = null;
const unary = function (x: string | null) {
  return unaryImpl(x);
};
let powerImpl: any = null;
const power = function (x: string | null) {
  return powerImpl(x);
};
let atomImpl: any = null;
const atom = function (x: string | null) {
  return atomImpl(x);
};

// atom = number | variable | '(' expr ')'
atomImpl = or(number, ident, between("(", expr, ")"));

// fold a flat chain [head, [[op, operand], ...]] into [op, a, b] (operator first).
const foldl = function (v: any) {
  let acc = v[0];
  const pairs = v[1] == null ? [] : v[1];
  for (let i = 0; i < pairs.length; i++) acc = [pairs[i][0], acc, pairs[i][1]];
  return acc;
};

const foldr = function (v: any) {
  const pairs = v[1] == null ? [] : v[1];
  if (pairs.length === 0) return v[0];
  let acc = pairs[pairs.length - 1][1];
  for (let i = pairs.length - 1; i >= 0; i--)
    acc = [pairs[i][0], i === 0 ? v[0] : pairs[i - 1][1], acc];
  return acc;
};

// power = atom { '^' atom }   — right-associative
powerImpl = all(atom, rep0(all("^", atom))).map(foldr);

// unary = '-' unary | power   — unary minus binds looser than ^
unaryImpl = or(all("-", unary), power);

// mul = unary { ('*' | '/' | '%') unary }   — left-associative
mulImpl = all(unary, rep0(all(or("*", "/", "%"), unary))).map(foldl);

// add = mul { ('+' | '-') mul }   — left-associative
addImpl = all(mul, rep0(all(or("+", "-"), mul))).map(foldl);

exprImpl = add;

describe("calculator", function () {
  function parse(s: string) {
    return expr(s);
  }

  it("chains subtraction left-associatively", function () {
    match(parse("2-3-4").value).with(["-", ["-", 2, 3], 4]);
  });

  it("chains division left-associatively", function () {
    match(parse("10/5/2").value).with(["/", ["/", 10, 5], 2]);
  });

  it("gives * / % higher precedence than + -", function () {
    match(parse("2+3*5").value).with(["+", 2, ["*", 3, 5]]);
  });

  it("chains ^ right-associatively (foldr)", function () {
    match(parse("2^3^2").value).with(["^", 2, ["^", 3, 2]]);
  });

  it("parses modulo", function () {
    match(parse("7%4").value).with(["%", 7, 4]);
  });

  it("parses unary minus", function () {
    match(parse("-2").value).with(["-", 2]);
  });

  it("binds unary minus looser than ^: -2^2 = -(2^2)", function () {
    match(parse("-2^2").value).with(["-", ["^", 2, 2]]);
  });

  it("binds unary minus tighter than *: -2*3 = (-2)*3", function () {
    match(parse("-2*3").value).with(["*", ["-", 2], 3]);
  });

  it("parses parens", function () {
    match(parse("(2+3)*4").value).with(["*", ["+", 2, 3], 4]);
  });

  it("parses variables", function () {
    match(parse("x*(y+1)").value).with(["*", "x", ["+", "y", 1]]);
  });

  it("2-3-4 consumes the whole input", function () {
    match(parse("2-3-4").rest).with("");
  });

  it("2^3^2 consumes the whole input", function () {
    match(parse("2^3^2").rest).with("");
  });

  it("shows the ASTs", function () {
    console.log("2-3-4    ->", JSON.stringify(parse("2-3-4")));
    console.log("2^3^2    ->", JSON.stringify(parse("2^3^2")));
    console.log("2+3*5    ->", JSON.stringify(parse("2+3*5")));
    console.log("-2^2     ->", JSON.stringify(parse("-2^2")));
    console.log("(2+3)*4  ->", JSON.stringify(parse("(2+3)*4")));
    console.log("x*(y+1)  ->", JSON.stringify(parse("x*(y+1)")));
  });
});
