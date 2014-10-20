/*
query           > shapedLogic | logic
shapedLogic	    > shaped | shaped space [Op [space]] shapedLogic | shaped space [Op space] logic
shaped          > (expr) | verbatim
logic    		> singleWord | singleWord space [Op [space]] shapedLogic  | singleWord space [Op space] logic
Op 				> 'AND' | 'OR'
verbatim        > '"'[ allExceptQuote ]'"'
singleWord      > nonSpecials {specials nonSpecials}
nonSpecials     > nonSpecial {nonSpecial}
specials        > special {special}
space 			> singleSpace {singleSpace}
*/

var assert = require("assert");
var tuco = require('../tuco');

function toString(x){ 
	if(x == null || typeof x == 'string')
		return x;
	return x.join(''); 
};

eval(tuco.nsImport('tuco'));

var spaceConst = ' \u00A0,;\n\r\t';
var specialConst = '"()';

var shapedLogicImpl = null;
var logicImpl = null;
var queryImpl = null;

function shapedLogic(x) { return shapedLogicImpl(x); };
function logic(x) { return logicImpl(x); };
function query(x) { return queryImpl(x); };

var special = rep1(charOneOf(specialConst));
var space   = rep1(charOneOf(spaceConst));
var nonSpecial = rep1(charExcept(spaceConst + specialConst));
var singleWord = all(nonSpecial.map(toString), rep0( special.map(toString), nonSpecial.map(toString))).map(toString);
var verbatim =   between('"', rep0(charExcept('"')).map(toString), '"');
var shaped = or(between('(', query, ')'), verbatim);

var op0 = optional(or('AND', 'OR'), optional(space)); // [Op [space]]
var op1 = optional(or('AND', 'OR'), space) ;          // [Op space]

var logicRest = or(all(space, op0, shapedLogic), all(space, op1, logic));
var shapedLogicImpl = all(shaped,     optional(logicRest));
var logicImpl       = all(singleWord, optional(logicRest));

var queryImpl = or(shapedLogic, logic);

describe('query', function() {
    it("big", function(){
		var result = query('bamboo OR (join AND ")quted test laenin,()!" bbq) AND "" OR ncx AND pgt');

		assert(result.rest == "");
    });
});
