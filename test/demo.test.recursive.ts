import { match } from '@beeff/loose-match';
import { all, charIs, optional } from '../src/tuco.ts';

function toString(x){ 
    if(x === null || typeof x === 'string')
        return x;
    return x.join(''); 
}

describe('recursive', function() {

    it("S = '(', [S], ')', [S]", function(){
        const sImpl = all(charIs('('), optional(s).map(toString), charIs(')'), optional(s).map(toString)).map(toString);

        function s(x) { return sImpl(x); };

        const inputs = [
            '()',
            '()()',
            '(())',
            '()()()()',
            '((())(()))(())()',
            '(((())(()))((())(())))',
            '()((((())(()))((())(())))(((())(()))((())(()))))'
        ];

        match(inputs.map(function(input){ return s(input); })).with(
            inputs.map(function(input){ return { value: input, rest: '' }; })
        );
    });
});
