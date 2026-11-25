const assert = require("assert");
const tuco = require('../tuco');

eval(tuco.nsImport('tuco'));

function toString(x){ 
    if(x === null || typeof x === 'string')
        return x;
    return x.join(''); 
};

function check(parse, input, value, rest){
    var result = parse(input);

    assert.deepEqual(result, {
        value: value || input,
        rest: rest || ''
    }); 
}

describe('recursive', function() {

    it("S = '(', [S], ')', [S]", function(){
        const sImpl = all(charIs('('), optional(s).map(toString) , charIs(')'), optional(s).map(toString)).map(toString);

        function s(x) { return  sImpl(x); };
        
        check(s, '()' );
        check(s, '()()');
        check(s, '(())');
        check(s, '()()()()');
        check(s, '((())(()))(())()');
        check(s, '(((())(()))((())(())))');
        check(s, '()((((())(()))((())(())))(((())(()))((())(()))))');
    });
});
