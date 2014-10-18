var assert = require("assert");
var tuco = require('../tuco');

eval(tuco.nsImport('tuco'));

var toString = function(x){ 
    if(x == null || typeof x == 'string')
        return x;
    return x.join(''); 
};

function check(parse, input, value, rest){
    var r = parse(input);

    assert.deepEqual(r, {
        value: value || input,
        rest: rest || ''
    }); 
}

describe('recursive', function() {

/*
    S = '(', [S], ')', [S]
*/

    it('', function(){
 
        var sImpl = null;
        var s = function (x) { return  sImpl(x); };
        
        var sImpl = all(charIs('('), optional(s).map(toString) , charIs(')'), optional(s).map(toString)).map(toString);
        
        check(s, '()' );
        check(s, '()()');
        check(s, '(())');
        check(s, '()()()()');
        check(s, '((())(()))(())()');
        check(s, '(((())(()))((())(())))');
        check(s, '()((((())(()))((())(())))(((())(()))((())(()))))');
    });
});
