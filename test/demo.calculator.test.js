/*

    expr    >  factor { ("+" | "-") factor }
    factor  >  term   { ("*" | "/") term   }
    term    >  NUM | "(" expr ")"

    Left-associative: operator tails fold left via an accumulator,
    so "2-3-4" parses as (2-3)-4, not 2-(3-4).

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

function apply(op, a, b) {
    switch(op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        default: throw new Error('unknown operator: ' + op);
    }
}

// operand { op operand } — folds operators left
function leftAssoc(operand, ops) {
    var rest = rep0(all(ops, operand));
    return all(operand, rest).map(function(v) {
        var acc = v[0];
        var pairs = v[1] == null ? [] : v[1];
        for (var i = 0; i < pairs.length; i++) {
            acc = apply(pairs[i][0], acc, pairs[i][1]);
        }
        return acc;
    });
}

var factorImpl = leftAssoc(term, or(charIs('*'), charIs('/')));
var factor = function(x) { return factorImpl(x); };

var exprImpl = leftAssoc(factor, or(charIs('+'), charIs('-')));

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
