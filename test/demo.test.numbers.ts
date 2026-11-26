/*
 number = ["+"|"-"]natNumber["."[natNumber]][("e"|"E")["+"|"-"]natNumber]
 natNumber = digit{digit}
 digit = "0"|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"
*/

import assert from 'node:assert';
import { all, charIs, charOneOf, optional, rep1 } from '../src/tuco.ts';
const toString = function(x){ return x.join(''); };

describe('numbers', function() {
    it('numbers not null', function(){
        // digit = "0"|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"
        const digit = charOneOf("0123456789");
        // natNumber = digit{digit}
        const natNumber = rep1(digit).map(toString);
        // ["+"|"-"]
        const sign = optional(charOneOf('+-'));
        // ["."[natNumber]]
        const fraction = optional(all(charIs('.'), natNumber)).map(toString);
        // [("e"|"E")["+"|"-"]natNumber]
        const exp = optional(all(charOneOf('eE'), sign, natNumber)).map(toString);
        // ["+"|"-"]natNumber["."[natNumber]][("e"|"E")["+"|"-"]natNumber]
        const number = all(sign, natNumber, fraction, exp).map(toString);
        
        const result = number('-012.12E-10zzzzz');
        
        assert.deepEqual(result,{
            value:'-012.12E-10',
            rest:'zzzzz'
        });
    })
        
});
