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

var assert = require("assert");
var tuco = require('../tuco');

eval(tuco.nsImport('tuco'));

var opt = optional;

function toString(x){ 
	if(x == null || typeof x == 'string')
		return x;
	return x.join(''); 
};

function toWord(v){
	return {kind:'word', value:toString(v)};
}

function toVerbatim(v) {
	return {kind:'verbatim', value:toString(v)};
}

function toOperator(v) {
	return {kind:v == null ? 'AND' : v};
}

function toRightArg (v){
	if(v == null)
		return v;

	var op = v[0];

	op.right = v[1];

	return op; 
}

function toLeftArg (v){
	if(v[1] == null)
		return v[0];

	var op = v[1];

	op.left =  v[0];

	return op;
}

var spaceConst = ' \u00A0,;\n\r\t';
var specialConst = '"()';

var shapedLogicImpl = null;
var logicImpl = null;
var queryImpl = null;

function shapedLogic(x) { return shapedLogicImpl(x); };
function logic(x) { return logicImpl(x); };
function query(x) { return queryImpl(x); };

var special 	= rep1(charOneOf(specialConst)).map(toString);
var space   	= rep1(charOneOf(spaceConst));
var nonSpecial 	= rep1(charExcept(spaceConst + specialConst)).map(toString);
var singleWord 	= all(nonSpecial, rep0( special, nonSpecial)).map(toWord);
var verbatim 	= between('"', rep0(charExcept('"')), '"').map(toVerbatim);
var shaped 		= or(between('(', query, ')'), verbatim);
var op0 		= optional(first(or('AND', 'OR'), optional(space))).map(toOperator); 
var op1 		= optional(first(or('AND', 'OR'), space)).map(toOperator); 
var logicRest 	= second(space, opt(or( all(op0, shapedLogic), all(op1, logic) ))).map(toRightArg);
var shapedLogicImpl = all(shaped, optional(logicRest)).map(toLeftArg);
var logicImpl   = all(singleWord, optional(logicRest)).map(toLeftArg);
var queryImpl 	= between(optional(space), optional(or(shapedLogic, logic)), optional(space));

describe('query', function() {
   	it("big", function(){
		var result = query('bamboo OR (join AND ")quted test laenin,()!" bbq) AND "" OR ncx AND pgt');
		
		assert(result.rest == "");
   	});


   	it("simple", function(){
		var result = query('x');
		
		assert.deepEqual(result,{
			value: { 
				kind:'word',
				value:'x'
			},
			rest:""
		});
   	});

   	it("simple with spaces", function(){
		var result = query(' x ');
		
		assert.deepEqual(result,{
			value: { 
				kind:'word',
				value:'x'
			},
			rest:""
		});
   	});

   	it("simple quoted", function(){
		var result = query('" x "');
		
		assert.deepEqual(result,{
			value: { 
				kind:'verbatim',
				value:' x '
			},
			rest:""
		});
   	});

   	it("simple parenthesed", function(){
		var result = query(' ( x ) ');
		
		assert.deepEqual(result,{
			value: { 
				kind:'word',
				value:'x'
			},
			rest:""
		});
   	});

   	it("simple parenthesed no spaces", function(){
		var result = query('(x)');
		
		assert.deepEqual(result,{
			value: { 
				kind:'word',
				value:'x'
			},
			rest:""
		});
   	});

   	it("operator AND", function(){
		var result = query('x AND y');
		
		assert.deepEqual(result,{
			value: { 
				kind:'AND',
				left:{
					kind:'word',
					value: 'x'
				},
				right:{
					kind:'word',
					value: 'y'
				},
			},
			rest:""
		});
   	});

   	it("operator OR", function(){
		var result = query('x OR y');
		
		assert.deepEqual(result,{
			value: { 
				kind:'OR',
				left:{
					kind:'word',
					value: 'x'
				},
				right:{
					kind:'word',
					value: 'y'
				},
			},
			rest:""
		});
   	});

   	it("implicit operator AND", function(){
		var result = query('x  y');
		
		assert.deepEqual(result,{
			value: { 
				kind:'AND',
				left:{
					kind:'word',
					value: 'x'
				},
				right:{
					kind:'word',
					value: 'y'
				},
			},
			rest:""
		});
   	});

   	it("empty verbatim", function(){
		var result = query('""');
		
		assert.deepEqual(result,{
			value: { 
				kind:'verbatim',
				value:null
			},
			rest:""
		});
   	});

   	it("empty parenthesises", function(){
		var result = query('()');
		
		assert.deepEqual(result,{
			value: null,
			rest:""
		});
   	});
});
