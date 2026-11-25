import assert from 'node:assert';
import {
    all, anyChar, between, chain, charExcept, charIs, charMeets, charOneOf, first,
    foldl, foldr, optional, or, rep0, rep1, second, word
} from '../tuco.js';

describe('map', function() {
    it('map not null', function(){
        const parser = all(word('first'), word('second'), word('third'))
                    .map(function(values) {
                        return values.join('.');
                    });
        var result = parser('firstsecondthirdrest');
        
        assert(!result.failed);
        assert(result.value === 'first.second.third');
        assert(result.rest === 'rest');
    });
    
    it('map null', function(){
        const parser = all(word('first'), word('second'), word('third'))
                    .map(function(values) {
                        return values.join('.');
                    });
        var result = parser('zerofirstsecondthird');
        
        assert(result.failed);
    })
});

describe('alternation',function(){
    it('or implicit `word`', function(){
        const parser = or('first', 'second', 'third');
        var result = parser('firstsecondthird');
        
        assert.deepEqual(result,{
            value:'first',
            rest: 'secondthird'
        });
    });

    it('or first not null', function(){
        const parser = or(word('first'), word('second'), word('third'));
        var result = parser('firstsecondthird');
        
        assert(!result.failed);
        assert(result.value === 'first');
        assert(result.rest === 'secondthird');
    });

    it('or second not null', function(){
        const parser = or(word('first'), word('second'), word('third'));
        var result = parser('secondfirstthird');
        
        assert(!result.failed);
        assert(result.value === 'second');
        assert(result.rest === 'firstthird');
    });
    
    it('or third not null', function(){
        const parser = or(word('first'), word('second'), word('third'));
        var result = parser('thirdfirstsecond');
        
        assert(!result.failed);
        assert(result.value === 'third');
        assert(result.rest === 'firstsecond');
    });
    
    it('or all null', function(){
        const parser = or(word('first'), word('second'), word('third'));
        var result = parser('fourththirdfirstsecond');
        
        assert(result.failed);
    })
});

describe('repetition', function(){
    it('rep1 not null',function(){
        const parser = rep1(charIs('x'));
        var result = parser('xxxxzzzz');
        
        assert(!result.failed);
        assert(result.value.length === 4);
        assert(result.rest === 'zzzz');
    });
    
    it('rep1 null',function(){
        const parser = rep1(charIs('x'));
        var result = parser('');
        
        assert(result.failed);
    });
    
    it('rep1 single not null',function(){
        const parser = rep1(charIs('x'));
        var result = parser('xy');
        
        assert(!result.failed);
        assert(result.value.length === 1);
        assert(result.rest === 'y');
    });

    it('rep0 not null',function(){
        const parser = rep0(charIs('x'));
        var result = parser('xxxxzzzz');
        
        assert(!result.failed);
        assert(result.value.length === 4);
        assert(result.rest === 'zzzz');
    });
    
    it('rep0 can\'t be null',function(){
        const parser = rep0(charIs('x'));
        var result = parser('zzz');
        
        assert(!result.failed);
        assert(result.value === null);
        assert(result.rest === 'zzz');
    });
    
    it('rep0 single not null',function(){
        const parser = rep1(charIs('x'));
        var result = parser('xzzz');
        
        assert(!result.failed);
        assert(result.value.length === 1);
        assert(result.rest === 'zzz');
    });

    it('rep1 implicit `all` result null when no match', function(){
        const parser = rep1(word('text'), word('text'));
        var result = parser('text and etc.');
        
        assert(result.failed, result);
    });

    it('rep1 implicit `all` value not null when match', function(){
        const parser = rep1(word('text1'), word('text2'));
        var result = parser('text1text2text1text2text1 and etc.');
        
        assert.deepEqual(result, {
            value:[["text1","text2"],["text1","text2"]],
            rest:"text1 and etc."
        });
    });

    it('rep0 implicit `all` value null when no match', function(){
        const parser = rep0(word('text1'), word('text2'));
        var result = parser('text1text and etc.');
        
        assert.deepEqual(result, {
            value:null,
            rest:"text1text and etc."
        });
    });

    it('rep0 implicit `word` value null when no match', function(){
        const parser = rep0('text1', 'text2');
        var result = parser('text1text and etc.');
        
        assert.deepEqual(result, {
            value:null,
            rest:"text1text and etc."
        });
    });

    it('rep0 implicit `all` value not null when match', function(){
        const parser = rep0(word('text1'), word('text2'));
        var result = parser('text1text2text1text2text1 and etc.');
        
        assert.deepEqual(result, {
            value:[["text1","text2"],["text1","text2"]],
            rest:"text1 and etc."
        });
    });

    it('rep0 implicit `word`', function(){
        const parser = rep0('text1', 'text2');
        var result = parser('text1text2text1text2text1 and etc.');
        
        assert.deepEqual(result, {
            value:[["text1","text2"],["text1","text2"]],
            rest:"text1 and etc."
        });
    });
});


describe ('option',function(){
    it('optional implicit `word`', function(){
        const parser = optional('text');
        var result = parser('text and etc.');
        
        assert.deepEqual(result,{
            value:'text',
            rest:' and etc.'
        });
    });

    it('optional not null', function(){
        const parser = optional(word('text'));
        var result = parser('text and etc.');
        
        assert(!result.failed);
        assert(result.value === 'text');
        assert(result.rest === ' and etc.');
    });
    
    it('optional can\'t be null', function(){
        const parser = optional(word('text'));
        var result = parser('xxx text and etc.');
        
        assert(!result.failed);
        assert(result.value === null);
        assert(result.rest === 'xxx text and etc.');
    })

    it('implicit `all` value null when no match', function(){
        const parser = optional(word('text'), word('text'));
        var result = parser('text and etc.');
        
        assert(!result.failed);
        assert(result.value === null);
        assert(result.rest === 'text and etc.');
    });

    it('implicit `all` value not null when match', function(){
        const parser = optional(word('text'), word('text'));
        var result = parser('texttext and etc.');
        
        assert(result.value.join('') === 'texttext', result.value);
        assert(result.rest === ' and etc.');
    });
});

describe('charXXX', function(){
    it('charExcept not null',function(){
        const parser = charExcept("");
        var result = parser('x123');
    
        assert(result.value === 'x' && result.rest === '123');
    }) ;
    
    it('charExcept null',function(){
        const parser = charExcept("x");
        var result = parser('x123');
    
        assert(result.failed);
    });
    
    it('charOneOF not null',function(){
        const parser = charOneOf("xyz");
        var result = parser('x123');
    
        assert(result.value === 'x' && result.rest === '123');
    });

   it('charOneOF null',function(){
        const parser = charOneOf("xyz");
        var result = parser('123');
    
        assert(result.failed);
    });

    it('charMeets not null',function(){
        const parser = charMeets(function(ch) { return ch === 'x'; });
        var result = parser('xyz');
    
        assert(result.value === 'x' && result.rest === 'yz');
    });

    it('charMeets null',function(){
        const parser = charMeets(function(ch) { return false; });
        var result = parser('xyz');
    
        assert(result.failed);
    });
    
    it('charIs("x") not null',function(){
        const parser = charIs('x');
        var result = parser('xyz');
    
        assert(result.value === 'x' && result.rest === 'yz');
    });
    
    it('charIs("x") null',function(){
        const parser = charIs('x');
        var result = parser('1yz');
    
        assert(result.failed);
    })
});

describe('all', function(){
    it('implicit `word`',function(){
        const parser = all('x','yy','x');
        var result = parser('xyyx and etc.');
        
        assert.deepEqual(result, {
            value: ['x','yy', 'x'],
            rest: ' and etc.'
        });
    });

    it('word not null',function(){
        const parser = word('text');
        var result = parser('text and etc.');
        
        assert(!result.failed);
        assert(result.value === 'text');
        assert(result.rest === ' and etc.');
    });

    it('word not null',function(){
        const parser = word('test');
        var result = parser('test and etc.');
        
        assert.deepEqual(result,{
            value:'test',
            rest:' and etc.'
        });
    });

    it('word null',function(){
        const parser = word('text');
        var result = parser('zzztext and etc.');
        
        assert(result.failed);
    });
    
    it('between not null',function(){
        const parser = between(charIs('('), charOneOf('xyz'), charIs(')'));
        var result = parser('(x)xxx');
        
        assert(!result.failed);
        assert(result.value === 'x');
        assert(result.rest === 'xxx');
    });

    it('between null',function(){
        const parser = between(charIs('('), charOneOf('xyz'), charIs(')'));
        var result = parser('(1)xxx');
        
        assert(result.failed);
    });

    it('between implicit `word`',function(){
        const parser = between('(', 'xyz', ')');
        var result = parser('(xyz)xxx');
        
        assert.deepEqual(result, {
            value:'xyz',
            rest:'xxx'
        });
    });

    it('first not null when match',function(){
        const parser = first(charOneOf('xyz'), charIs('/'));
        var result = parser('x/rest');
        
        assert.deepEqual(result,{
            value:'x',
            rest:'rest'
        });
    });

    it('first is null when no match',function(){
        const parser = first(charOneOf('xyz'), charIs('/'));
        var result = parser('k\\rest');
        
        assert(result.failed);
    });

    it('second implicit `word`',function(){
        const parser = first('xyz', '/');
        var result = parser('xyz/rest');
        
        assert.deepEqual(result,{
            value:'xyz',
            rest:'rest'
        });
    });


    it('second not null when match',function(){
        const parser = second(charIs('\\'), charOneOf('xyz'));
        var result = parser('\\xxxx');
        
        assert(!result.failed);
        assert(result.value === 'x');
        assert(result.rest === 'xxx');
    });

    it('second is null when no match',function(){
        const parser = second(charIs('\\'), charOneOf('xyz'));
        var result = parser('/xxxx');
        
        assert(result.failed);
    });

    it('second implicit `word`',function(){
        const parser = second('\\','xyz');
        var result = parser('\\xyzxxx');
        
        assert.deepEqual(result, {
            value:'xyz',
            rest:'xxx'
        });
    });
    
    it('all not null when match',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var result = parser('xyz1rest');
        
        assert.deepEqual(result,{
            value:['x','y','z','1'],
            rest:'rest'
        });
    });

    it('all first null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var result = parser('_yz1rest');
        
        assert(result.failed);
    });

    it('all second null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var result = parser('x_z1rest');
        
        assert(result.failed);
    });
    
    it('all third null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var result = parser('xy_1rest');
        
        assert(result.failed);
    });
    
    it('all fourth null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var result = parser('xyz_rest');
        
        assert(result.failed);
    });

    it('all empty null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        var result = parser('');
        
        assert(result.failed);
    })
});

describe('anyChar', function(){
    it('value and rest are not when match', function(){
        const parser = anyChar();
        var result = parser('123');
        
        assert(result.value === '1' && result.rest === '23' );
    });

    it('empty string should fail', function(){
        const parser = anyChar();
        var result = parser('');

        assert(result.failed);
    });

    it('null should fail', function(){
        const parser = anyChar();
        var result = parser(null);

        assert(result.failed);
    })
});

describe('chain / foldl / foldr', function() {
    const num = rep1(charOneOf('0123456789')).map(function(x){
        return parseInt(x.join(''));
    });
    const minus = charIs('-');

    it('chain returns [head, pairs] for a chain', function(){
        const parser = chain(num, minus);
        var result = parser('2-3-4');

        assert.deepEqual(result, { value:[2, [['-',3], ['-',4]]], rest:'' });
    });

    it('chain returns [head, null] when no operator follows', function(){
        const parser = chain(num, minus);
        var result = parser('2');

        assert.deepEqual(result, { value:[2, null], rest:'' });
    });

    it('foldl builds a left-leaning AST with the default apply', function(){
        const parser = chain(num, minus).map(foldl());
        var result = parser('2-3-4');

        assert.deepEqual(result.value, ['-', ['-', 2, 3], 4]);
    });

    it('foldr builds a right-leaning AST with the default apply', function(){
        const parser = chain(num, minus).map(foldr());
        var result = parser('2-3-4');

        assert.deepEqual(result.value, ['-', 2, ['-', 3, 4]]);
    });

    it('foldl folds left with a custom apply', function(){
        const parser = chain(num, minus).map(foldl(function(op, a, b){ return a - b; }));
        var result = parser('2-3-4');

        assert.deepEqual(result.value, -5);
    });

    it('foldr folds right with a custom apply', function(){
        const parser = chain(num, minus).map(foldr(function(op, a, b){ return a - b; }));
        var result = parser('2-3-4');

        assert.deepEqual(result.value, 3);
    });

    it('foldl/foldr return the head unchanged for a single operand', function(){
        const sub = function(op, a, b){ return a - b; };
        const foldLeft  = chain(num, minus).map(foldl(sub));
        const foldRight = chain(num, minus).map(foldr(sub));
        var resultLeft  = foldLeft('7');
        var resultRight = foldRight('7');

        assert.deepEqual(resultLeft.value, 7);
        assert.deepEqual(resultRight.value, 7);
    });

    it('chain validates its arguments', function(){
        assert.throws(function(){ chain(word('a')); }, /accepts two combinators/);
    });

    it('foldl/foldr validate the optional apply', function(){
        assert.throws(function(){ foldl('nope'); }, /optional apply function/);
        assert.throws(function(){ foldr('nope'); }, /optional apply function/);
    });
});

describe('errors', function(){
    it('carries the position and expected', function(){
        const parser = word('abc');
        var result = parser('abx');

        assert(result.failed);
        assert.strictEqual(result.pos, 2);
        assert.deepEqual(result.expected, ['"c"']);
    });

    it('or keeps the furthest failure and unions expectations', function(){
        const parser = or(word('ab'), word('ax'));
        var result = parser('az');

        assert(result.failed);
        assert.strictEqual(result.pos, 1);
        assert.deepEqual(result.expected, ['"b"', '"x"']);
    });

    it('all propagates the first failure', function(){
        const parser = all(charIs('a'), charIs('b'));
        var result = parser('ax');

        assert(result.failed);
        assert.strictEqual(result.pos, 1);
        assert.deepEqual(result.expected, ['"b"']);
    });
});

describe('argument validation', function(){
    it('word rejects an empty string at construction', function(){
        assert.throws(function(){ word(''); }, /non-empty string/);
    });

    it('rep1 requires at least one combinator', function(){
        assert.throws(function(){ rep1(); }, /at least one combinator/);
    });

    it('rep0 requires at least one combinator', function(){
        assert.throws(function(){ rep0(); }, /at least one combinator/);
    });

    it('optional requires at least one combinator', function(){
        assert.throws(function(){ optional(); }, /at least one combinator/);
    });
});
