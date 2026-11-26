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

import { match } from '@beeff/loose-match';
import {
    all, between, charExcept, charOneOf, first, optional, or, rep0, rep1, second, word
} from '@beeff/tuco';

const opt = optional;

function toString(x){ 
	if(x === null || typeof x === 'string')
		return x;
	return x.join(''); 
}

function toWord(v){
	return {kind:'word', value:toString(v)};
}

function toVerbatim(v) {
	return {kind:'verbatim', value:toString(v)};
}

function toOperator(v) {
	return {kind:v === null ? 'AND' : v};
}

function toRightArg (v){
	if(v === null)
		return v;

	const op = v[0];

	op.right = v[1];

	return op; 
}

function toLeftArg (v){
	if(v[1] === null)
		return v[0];

	const op = v[1];

	op.left =  v[0];

	return op;
}

const spaceConst = ' \u00A0,;\n\r\t';
const specialConst = '"()';

let shapedLogicImpl: any = null;
let logicImpl: any = null;
let queryImpl: any = null;

function shapedLogic(x) { return shapedLogicImpl(x); };
function logic(x) { return logicImpl(x); };
function query(x) { return queryImpl(x); };

const special 	= rep1(charOneOf(specialConst)).map(toString);
const space   	= rep1(charOneOf(spaceConst));
const nonSpecial 	= rep1(charExcept(spaceConst + specialConst)).map(toString);
const singleWord 	= all(nonSpecial, rep0( special, nonSpecial)).map(toWord);
const verbatim 	= between('"', rep0(charExcept('"')), '"').map(toVerbatim);
const shaped 		= or(between('(', query, ')'), verbatim);
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
const op0 		= opt(first(or('AND', 'OR'), opt(space))).map(toOperator); 
const op1 		= opt(first(or('AND', 'OR'), space)).map(toOperator); 
const logicRest 	= second(space, opt(or( all(op0, shapedLogic), all(op1, logic) ))).map(toRightArg);
shapedLogicImpl = all(shaped, opt(logicRest)).map(toLeftArg);
logicImpl   = all(singleWord, opt(logicRest)).map(toLeftArg);
queryImpl 	= between(opt(space), opt(or(shapedLogic, logic)), opt(space));

function parseQuery(text){
	const result = query(text);

	if(result.failed)
		return result;

	if(result.rest === '')
		return result;

	// Leftover input: the grammar consumed a prefix and stopped.  Report the
	// first unconsumed character's position as the error site.
	return { failed:true, pos: text.length - result.rest.length, expected:['end of input'] };
}

function buildClauses(result){
	if(result === null)
		return [];

	if(result.kind in {"word":0, "verbatim":0} )
		return [result.value];

	if(result.kind in {"OR":0, "AND":0})
		return [].concat(buildClauses(result.left), buildClauses(result.right));

	throw new Error('wrong kind');
}

describe('query', function() {
   	it("big", function(){
		const result = query('bamboo OR (join AND ")quted test laenin,()!" bbq) AND "" OR ncx AND pgt');
		
		match(result.rest).with('');
   	});


   	it("simple", function(){
		const result = query('x');
		
		match(result).with({
			value: { 
				kind:'word',
				value:'x'
			},
			rest:""
		});
   	});

   	it("simple with spaces", function(){
		const result = query(' x ');
		
		match(result).with({
			value: { 
				kind:'word',
				value:'x'
			},
			rest:""
		});
   	});

   	it("simple quoted", function(){
		const result = query('" x "');
		
		match(result).with({
			value: { 
				kind:'verbatim',
				value:' x '
			},
			rest:""
		});
   	});

   	it("simple parenthesed", function(){
		const result = query(' ( x ) ');
		
		match(result).with({
			value: { 
				kind:'word',
				value:'x'
			},
			rest:""
		});
   	});

   	it("simple parenthesed no spaces", function(){
		const result = query('(x)');
		
		match(result).with({
			value: { 
				kind:'word',
				value:'x'
			},
			rest:""
		});
   	});

   	it("operator AND", function(){
		const result = query('x AND y');
		
		match(result).with({
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
		const result = query('x OR y');
		
		match(result).with({
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
		const result = query('x  y');
		
		match(result).with({
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
		const result = query('""');
		
		match(result).with({
			value: { 
				kind:'verbatim',
				value:null
			},
			rest:""
		});
   	});

   	it("empty parenthesises", function(){
		const result = query('()');
		
		match(result).with({
			value: null,
			rest:""
		});
   	});
});

describe('query errors', function(){
	it('dangling quote', function() {
		const result = parseQuery('"test');

		match(result).with( {
			failed:true,
			pos:0,
			expected:['end of input']
		});
	});

	it('dangling parenthesis', function() {
		const result = parseQuery('test (');

		match(result).with( {
			failed:true,
			pos:5,
			expected:['end of input']
		});
	});
});

describe('build clauses', function(){
	it('single word', function(){
		const result = buildClauses(query('test').value);

		match(result).with( ['test']);
	});

	it('several word', function(){
		const result = buildClauses(query('test1 test2 test3').value);

		match(result.sort()).with( ['test1', 'test2', 'test3']);
	});

	it('several word and parenthesises', function(){
		const result = buildClauses(query('test1 (test2 test3)').value);

		match(result.sort()).with( ['test1', 'test2', 'test3']);
	});

	it('several word and parenthesises and verbatim', function(){
		const result = buildClauses(query('test1 (test2 test3 AND "quoted string")').value);

		match(result.sort()).with( ['quoted string', 'test1', 'test2', 'test3']);
	});

	it('null result gives no clauses', function(){
		const result = buildClauses(null);

		match(result).with( []);
	});
});