/*

    expr    >  factor { ("+" | "-") factor }
    factor  >  term   { ("*" | "/") term   }
    term    >  NUM | "(" expr ")"

    Left-associative: operator chains are folded left with foldl.

*/

var assert = require("assert");
var tuco = require('../tuco');

eval(tuco.nsImport('tuco'));

var number = rep1(charOneOf("0123456789")).map(function(x){
    return parseInt(x.join(''));
});

var exprImpl = null;
var expr = function(x) { return exprImpl(x); };

var term = or(number, between('(', expr, ')'));

var mulOp = or(charIs('*'), charIs('/'));
var addOp = or(charIs('+'), charIs('-'));

function apply(op, a, b) {
    switch(op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        default: throw new Error('unknown operator: ' + op);
    }
}

var factorImpl = chain(term, mulOp).map(foldl(apply));
var factor = function(x) { return factorImpl(x); };

var exprImpl = chain(factor, addOp).map(foldl(apply));

describe('calculator', function() {
    function evalExpr(s) {
        return expr(s).value;
    }

    it('is left-associative for subtraction', function() {
        assert.strictEqual(evalExpr('2-3-4'), -5);
    });

    it('is left-associative for division', function() {
        assert.strictEqual(evalExpr('10/5/2'), 1);
    });

    it('gives * and / higher precedence than + and -', function() {
        assert.strictEqual(evalExpr('2+3*5'), 17);
    });

    it('evaluates the reference expression', function() {
        assert.strictEqual(evalExpr('(2+3*5)*(4+7)+1'), 188);
    });

    it('consumes the whole input', function() {
        assert.strictEqual(expr('2-3-4').rest, '');
    });
});
