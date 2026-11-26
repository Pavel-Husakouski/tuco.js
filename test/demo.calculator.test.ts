/*
    expr   = add
    add    = mul { ('+' | '-') mul }             ; left → foldLeft
    mul    = unary { ('*' | '/' | '%') unary }   ; left → foldLeft
    unary  = '-' unary | power                   ; unary minus binds looser than ^
    power  = atom { '^' atom }                   ; right → foldRight
    atom   = number | variable | '(' expr ')'
    number = [0-9]+
    variable = [a-zA-Z][a-zA-Z0-9]*

    foldLeft/foldRight yield [op, a, b] (operator first).
*/

import { match } from '@beeff/loose-match';
import {
    all, between, charIs, charMeets, charOneOf, foldLeft, foldRight, or, rep0, rep1
} from '../src/tuco.ts';

const number = rep1(charOneOf("0123456789")).map(function(x){
    return parseInt(x.join(''));
});

const isLetter    = function(c){ return /[a-zA-Z]/.test(c); };
const isIdentChar = function(c){ return /[a-zA-Z0-9]/.test(c); };
const ident = all(charMeets(isLetter), rep0(charMeets(isIdentChar))).map(function(v){
    return v[0] + (v[1] === null ? '' : v[1].join(''));
});

let exprImpl: any  = null;
const expr  = function(x){ return exprImpl(x); };
let addImpl: any   = null;
const add   = function(x){ return addImpl(x); };
let mulImpl: any   = null;
const mul   = function(x){ return mulImpl(x); };
let unaryImpl: any = null;
const unary = function(x){ return unaryImpl(x); };
let powerImpl: any = null;
const power = function(x){ return powerImpl(x); };
let atomImpl: any  = null;
const atom  = function(x){ return atomImpl(x); };

// atom = number | variable | '(' expr ')'
atomImpl = or(
    number,
    ident,
    between('(', expr, ')')
);

// power = atom { '^' atom }   — right-associative, foldRight
powerImpl = foldRight(atom, charIs('^'));

// unary = '-' unary | power   — unary minus binds looser than ^
unaryImpl = or(
    all(charIs('-'), unary),
    power
);

// mul = unary { ('*' | '/' | '%') unary }   — left, foldLeft
mulImpl = foldLeft(unary, or(charIs('*'), charIs('/'), charIs('%')));

// add = mul { ('+' | '-') mul }   — left, foldLeft
addImpl = foldLeft(mul, or(charIs('+'), charIs('-')));

exprImpl = add;

describe('calculator', function() {
    function parse(s) { return expr(s); }

    it('chains subtraction left-associatively', function(){
        match(parse('2-3-4').value).with(['-', ['-', 2, 3], 4]);
    });

    it('chains division left-associatively', function(){
        match(parse('10/5/2').value).with(['/', ['/', 10, 5], 2]);
    });

    it('gives * / % higher precedence than + -', function(){
        match(parse('2+3*5').value).with(['+', 2, ['*', 3, 5]]);
    });

    it('chains ^ right-associatively (foldr)', function(){
        match(parse('2^3^2').value).with(['^', 2, ['^', 3, 2]]);
    });

    it('parses modulo', function(){
        match(parse('7%4').value).with(['%', 7, 4]);
    });

    it('parses unary minus', function(){
        match(parse('-2').value).with(['-', 2]);
    });

    it('binds unary minus looser than ^: -2^2 = -(2^2)', function(){
        match(parse('-2^2').value).with(['-', ['^', 2, 2]]);
    });

    it('binds unary minus tighter than *: -2*3 = (-2)*3', function(){
        match(parse('-2*3').value).with(['*', ['-', 2], 3]);
    });

    it('parses parens', function(){
        match(parse('(2+3)*4').value).with(['*', ['+', 2, 3], 4]);
    });

    it('parses variables', function(){
        match(parse('x*(y+1)').value).with(['*', 'x', ['+', 'y', 1]]);
    });

    it('2-3-4 consumes the whole input', function(){
        match(parse('2-3-4').rest).with('');
    });

    it('2^3^2 consumes the whole input', function(){
        match(parse('2^3^2').rest).with('');
    });

    it('shows the ASTs', function(){
        console.log('2-3-4    ->', JSON.stringify(parse('2-3-4')));
        console.log('2^3^2    ->', JSON.stringify(parse('2^3^2')));
        console.log('2+3*5    ->', JSON.stringify(parse('2+3*5')));
        console.log('-2^2     ->', JSON.stringify(parse('-2^2')));
        console.log('(2+3)*4  ->', JSON.stringify(parse('(2+3)*4')));
        console.log('x*(y+1)  ->', JSON.stringify(parse('x*(y+1)')));
    });
});
