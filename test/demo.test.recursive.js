var assert = require("assert");
var tuco = require('../tuco');

eval(tuco.nsImport('tuco'));

var toString = function(x){ return x.join(''); };

function check(parse, input, value, rest){
        value = value || input;
        rest = rest || '';

        var r = parse(input);

        var conditions = [ {test:r != null, msg:"result not null"},
          {test:r.value == value, msg:"expected value:" + JSON.stringify(value) + " actual value:"+JSON.stringify(r.value)},
         {test:r.rest == rest, msg:"expected rest:" + JSON.stringify(rest) + " actual rest:"+JSON.stringify(r.rest)}]
         
        assert(conditions.every(function(x) { return x.test;}), JSON.stringify(conditions, null,2)); 
}

describe('recursive', function() {

/*
    S = (S)S | (S) | ()S | ()
*/

    it('', function(){
 
        var parse = null;
        var s = function (x) { return  parse(x); };
        
        var s1 = all(charIs('('), s , charIs(')'));
        
        parse = or(all(s1.map(toString), s).map(toString) , s1.map(toString), all(word('()'),s).map(toString), word('()'));

        check(parse, '()');
        check(parse, '()()');
        check(parse, '(())');
        check(parse, '()()()()');
        check(parse, '((())(()))(())()');
        check(parse, '(((())(()))((())(())))');
        check(parse, '()((((())(()))((())(())))(((())(()))((())(()))))');
    });
});
