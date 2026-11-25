/*
    expr = add
    add = mul '+' mul | mul '-' mul | mul
    mul = power '*' power | power '/' power | power '%' power | power
    power = atom '^' atom | atom
    atom = number | var | '-' atom | '(' expr ')'
    number = [0-9]+
    var = [a-zA-Z][a-zA-Z0-9]*

    Без chain / foldl / foldr — грамматика ровно как записана:
    каждый уровень бинарный (ровно два операнда), цепочки не сворачиваются.
*/

var assert = require("assert");
var tuco = require('../tuco');

eval(tuco.nsImport('tuco'));

var number = rep1(charOneOf("0123456789")).map(function(x){
    return parseInt(x.join(''));
});

var isLetter    = function(c){ return /[a-zA-Z]/.test(c); };
var isIdentChar = function(c){ return /[a-zA-Z0-9]/.test(c); };
var ident = all(charMeets(isLetter), rep0(charMeets(isIdentChar))).map(function(v){
    return v[0] + (v[1] == null ? '' : v[1].join(''));
});

var exprImpl  = null, expr  = function(x){ return exprImpl(x); };
var addImpl   = null, add   = function(x){ return addImpl(x); };
var mulImpl   = null, mul   = function(x){ return mulImpl(x); };
var powerImpl = null, power = function(x){ return powerImpl(x); };
var atomImpl  = null, atom  = function(x){ return atomImpl(x); };

// atom = number | var | '-' atom | '(' expr ')'
atomImpl = or(
    number,
    ident,
    all(charIs('-'), atom),
    between('(', expr, ')')
);

// power = atom '^' atom | atom
powerImpl = or(
    all(atom, charIs('^'), atom),
    atom
);

// mul = power '*' power | power '/' power | power '%' power | power
mulImpl = or(
    all(power, charIs('*'), power),
    all(power, charIs('/'), power),
    all(power, charIs('%'), power),
    power
);

// add = mul '+' mul | mul '-' mul | mul
addImpl = or(
    all(mul, charIs('+'), mul),
    all(mul, charIs('-'), mul),
    mul
);

exprImpl = add;

describe('calculator (raw grammar, без chain/foldl/foldr)', function() {
    function parse(s) { return expr(s); }

    it('parses a number', function(){
        assert.deepEqual(parse('42'), { value: 42, rest: '' });
    });

    it('gives * / % higher precedence than + -', function(){
        assert.deepEqual(parse('2+3*5').value, [2, '+', [3, '*', 5]]);
    });

    it('does NOT chain: 2-3-4 leaves "-4" unconsumed', function(){
        assert.deepEqual(parse('2-3-4'), { value: [2, '-', 3], rest: '-4' });
    });

    it('does NOT chain ^: 2^3^2 leaves "^2" unconsumed', function(){
        assert.deepEqual(parse('2^3^2'), { value: [2, '^', 3], rest: '^2' });
    });

    it('parses unary minus', function(){
        assert.deepEqual(parse('-2').value, ['-', 2]);
    });

    it('binds unary minus tighter than ^: -2^2 = (-2)^2', function(){
        assert.deepEqual(parse('-2^2').value, [['-', 2], '^', 2]);
    });

    it('parses parens', function(){
        assert.deepEqual(parse('(2+3)*4').value, [[2, '+', 3], '*', 4]);
    });

    it('parses variables', function(){
        assert.deepEqual(parse('x*(y+1)').value, ['x', '*', ['y', '+', 1]]);
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
