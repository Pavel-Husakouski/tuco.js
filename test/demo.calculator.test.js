/*

    expr 		>  factor expr_tail
    expr_tail	>  ["+" factor expr_tail | "-" factor expr_tail]
    factor 		>  term factor_tail
    factor_tail >  ["*" term factor_tail | "/" term factor_tail]
    term 		>  NUM | "(" expr ")"

*/

var assert = require("assert");
var tuco = require('../tuco');

eval(tuco.nsImport('tuco'));

var opt = optional;

function toString(x){ 
	if(x == null || typeof x == 'string')
		return x;
	return x.join(''); 
};

function stripLastEmpty(v){
	if(v == null || v[v.length - 1] != null)
		return v;

	var r = v.slice(0, -1);

	return r.length == 1 ? r[0] : r;
}

var exprImpl = null;
var expr = function(x) {  return exprImpl(x); };

var factorTailImpl = null;
var factorTail = function(x) {  return factorTailImpl(x); };

var exprTailImpl = null;
var exprTail = function(x) {  return exprTailImpl(x); };

var number = rep1(charOneOf("0123456789")).map(function(x){
	return parseInt(toString(x));
});

var term 			= or(number, between('(', expr, ')'));
var factorTailImpl 	= opt(or(all('*', term, factorTail), all('/', term, factorTail))).map(stripLastEmpty);
var factor 			= all(term, factorTail).map(stripLastEmpty);
var exprTailImpl 	= opt(or(all('+', factor, exprTail), all('-', factor, exprTail))).map(stripLastEmpty);
var exprImpl 		= all(factor, exprTail).map(stripLastEmpty);


var r =  expr('(2+3*5)*(4+7)+1');

console.log(JSON.stringify(r, null, '\t'));
