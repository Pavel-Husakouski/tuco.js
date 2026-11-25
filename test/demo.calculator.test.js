/*
    expr   = add
    add    = mul { ('+' | '-') mul }             ; левая  → chain + foldl
    mul    = unary { ('*' | '/' | '%') unary }   ; левая  → chain + foldl
    unary  = '-' unary | power                   ; унарный минус слабее ^
    power  = atom { '^' atom }                   ; правая → chain + foldr
    atom   = number | var | '(' expr ')'
    number = [0-9]+
    var    = [a-zA-Z][a-zA-Z0-9]*

    foldl/foldr дают [op, a, b] (оператор первым).
*/

import assert from 'node:assert';
import {
    all, between, chain, charIs, charMeets, charOneOf, foldl, foldr, or, rep0, rep1
} from '../tuco.js';

const number = rep1(charOneOf("0123456789")).map(function(x){
    return parseInt(x.join(''));
});

const isLetter    = function(c){ return /[a-zA-Z]/.test(c); };
const isIdentChar = function(c){ return /[a-zA-Z0-9]/.test(c); };
const ident = all(charMeets(isLetter), rep0(charMeets(isIdentChar))).map(function(v){
    return v[0] + (v[1] === null ? '' : v[1].join(''));
});

var exprImpl  = null, expr  = function(x){ return exprImpl(x); };
var addImpl   = null, add   = function(x){ return addImpl(x); };
var mulImpl   = null, mul   = function(x){ return mulImpl(x); };
var unaryImpl = null, unary = function(x){ return unaryImpl(x); };
var powerImpl = null, power = function(x){ return powerImpl(x); };
var atomImpl  = null, atom  = function(x){ return atomImpl(x); };

// atom = number | var | '(' expr ')'
atomImpl = or(
    number,
    ident,
    between('(', expr, ')')
);

// power = atom { '^' atom }   — правая ассоциативность, chain + foldr
powerImpl = chain(atom, charIs('^')).map(foldr());

// unary = '-' unary | power   — унарный минус слабее ^
unaryImpl = or(
    all(charIs('-'), unary),
    power
);

// mul = unary { ('*' | '/' | '%') unary }   — левая, chain + foldl
mulImpl = chain(unary, or(charIs('*'), charIs('/'), charIs('%'))).map(foldl());

// add = mul { ('+' | '-') mul }   — левая, chain + foldl
addImpl = chain(mul, or(charIs('+'), charIs('-'))).map(foldl());

exprImpl = add;

describe('calculator', function() {
    function parse(s) { return expr(s); }

    it('chains subtraction left-associatively', function(){
        assert.deepEqual(parse('2-3-4').value, ['-', ['-', 2, 3], 4]);
    });

    it('chains division left-associatively', function(){
        assert.deepEqual(parse('10/5/2').value, ['/', ['/', 10, 5], 2]);
    });

    it('gives * / % higher precedence than + -', function(){
        assert.deepEqual(parse('2+3*5').value, ['+', 2, ['*', 3, 5]]);
    });

    it('chains ^ right-associatively (foldr)', function(){
        assert.deepEqual(parse('2^3^2').value, ['^', 2, ['^', 3, 2]]);
    });

    it('parses modulo', function(){
        assert.deepEqual(parse('7%4').value, ['%', 7, 4]);
    });

    it('parses unary minus', function(){
        assert.deepEqual(parse('-2').value, ['-', 2]);
    });

    it('binds unary minus looser than ^: -2^2 = -(2^2)', function(){
        assert.deepEqual(parse('-2^2').value, ['-', ['^', 2, 2]]);
    });

    it('binds unary minus tighter than *: -2*3 = (-2)*3', function(){
        assert.deepEqual(parse('-2*3').value, ['*', ['-', 2], 3]);
    });

    it('parses parens', function(){
        assert.deepEqual(parse('(2+3)*4').value, ['*', ['+', 2, 3], 4]);
    });

    it('parses variables', function(){
        assert.deepEqual(parse('x*(y+1)').value, ['*', 'x', ['+', 'y', 1]]);
    });

    it('consumes the whole input', function(){
        assert.strictEqual(parse('2-3-4').rest, '');
        assert.strictEqual(parse('2^3^2').rest, '');
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
