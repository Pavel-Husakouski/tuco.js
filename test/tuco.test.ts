import assert from 'node:assert';
import {
    all, anyChar, between, charExcept, charIs, charMeets, charOneOf, first,
    foldLeft, foldRight, optional, or, rep0, rep1, second, word
} from '../src/tuco.ts';

describe('map', function() {
    it('map not null', function(){
        const parser = all(word('first'), word('second'), word('third'))
                    .map(function(values) {
                        return values.join('.');
                    });
        const result = parser('firstsecondthirdrest');
        
        assert.deepEqual(result, { value: 'first.second.third', rest: 'rest' });
    });
    
    it('map null', function(){
        const parser = all(word('first'), word('second'), word('third'))
                    .map(function(values) {
                        return values.join('.');
                    });
        const result = parser('zerofirstsecondthird');
        
        assert('failed' in result);
    })
});

describe('alternation',function(){
    it('or implicit `word`', function(){
        const parser = or('first', 'second', 'third');
        const result = parser('firstsecondthird');
        
        assert.deepEqual(result,{
            value:'first',
            rest: 'secondthird'
        });
    });

    it('or first not null', function(){
        const parser = or(word('first'), word('second'), word('third'));
        const result = parser('firstsecondthird');
        
        assert.deepEqual(result, { value: 'first', rest: 'secondthird' });
    });

    it('or second not null', function(){
        const parser = or(word('first'), word('second'), word('third'));
        const result = parser('secondfirstthird');
        
        assert.deepEqual(result, { value: 'second', rest: 'firstthird' });
    });
    
    it('or third not null', function(){
        const parser = or(word('first'), word('second'), word('third'));
        const result = parser('thirdfirstsecond');
        
        assert.deepEqual(result, { value: 'third', rest: 'firstsecond' });
    });
    
    it('or all null', function(){
        const parser = or(word('first'), word('second'), word('third'));
        const result = parser('fourththirdfirstsecond');
        
        assert('failed' in result);
    })
});

describe('repetition', function(){
    it('rep1 not null',function(){
        const parser = rep1(charIs('x'));
        const result = parser('xxxxzzzz');
        
        assert.deepEqual(result, { value: ['x', 'x', 'x', 'x'], rest: 'zzzz' });
    });
    
    it('rep1 null',function(){
        const parser = rep1(charIs('x'));
        const result = parser('');
        
        assert('failed' in result);
    });
    
    it('rep1 single not null',function(){
        const parser = rep1(charIs('x'));
        const result = parser('xy');
        
        assert.deepEqual(result, { value: ['x'], rest: 'y' });
    });

    it('rep0 not null',function(){
        const parser = rep0(charIs('x'));
        const result = parser('xxxxzzzz');
        
        assert.deepEqual(result, { value: ['x', 'x', 'x', 'x'], rest: 'zzzz' });
    });
    
    it('rep0 can\'t be null',function(){
        const parser = rep0(charIs('x'));
        const result = parser('zzz');
        
        assert.deepEqual(result, { value: null, rest: 'zzz' });
    });
    
    it('rep0 single not null',function(){
        const parser = rep1(charIs('x'));
        const result = parser('xzzz');
        
        assert.deepEqual(result, { value: ['x'], rest: 'zzz' });
    });

    it('rep1 implicit `all` result null when no match', function(){
        const parser = rep1(word('text'), word('text'));
        const result = parser('text and etc.');
        
        assert('failed' in result);
    });

    it('rep1 implicit `all` value not null when match', function(){
        const parser = rep1(word('text1'), word('text2'));
        const result = parser('text1text2text1text2text1 and etc.');
        
        assert.deepEqual(result, {
            value:[["text1","text2"],["text1","text2"]],
            rest:"text1 and etc."
        });
    });

    it('rep0 implicit `all` value null when no match', function(){
        const parser = rep0(word('text1'), word('text2'));
        const result = parser('text1text and etc.');
        
        assert.deepEqual(result, {
            value:null,
            rest:"text1text and etc."
        });
    });

    it('rep0 implicit `word` value null when no match', function(){
        const parser = rep0('text1', 'text2');
        const result = parser('text1text and etc.');
        
        assert.deepEqual(result, {
            value:null,
            rest:"text1text and etc."
        });
    });

    it('rep0 implicit `all` value not null when match', function(){
        const parser = rep0(word('text1'), word('text2'));
        const result = parser('text1text2text1text2text1 and etc.');
        
        assert.deepEqual(result, {
            value:[["text1","text2"],["text1","text2"]],
            rest:"text1 and etc."
        });
    });

    it('rep0 implicit `word`', function(){
        const parser = rep0('text1', 'text2');
        const result = parser('text1text2text1text2text1 and etc.');
        
        assert.deepEqual(result, {
            value:[["text1","text2"],["text1","text2"]],
            rest:"text1 and etc."
        });
    });
});


describe ('option',function(){
    it('optional implicit `word`', function(){
        const parser = optional('text');
        const result = parser('text and etc.');
        
        assert.deepEqual(result,{
            value:'text',
            rest:' and etc.'
        });
    });

    it('optional not null', function(){
        const parser = optional(word('text'));
        const result = parser('text and etc.');
        
        assert.deepEqual(result, { value: 'text', rest: ' and etc.' });
    });
    
    it('optional can\'t be null', function(){
        const parser = optional(word('text'));
        const result = parser('xxx text and etc.');
        
        assert.deepEqual(result, { value: null, rest: 'xxx text and etc.' });
    })

    it('implicit `all` value null when no match', function(){
        const parser = optional(word('text'), word('text'));
        const result = parser('text and etc.');
        
        assert.deepEqual(result, { value: null, rest: 'text and etc.' });
    });

    it('implicit `all` value not null when match', function(){
        const parser = optional(word('text'), word('text'));
        const result = parser('texttext and etc.');
        
        assert.deepEqual(result, { value: ['text', 'text'], rest: ' and etc.' });
    });
});

describe('charXXX', function(){
    it('charExcept not null',function(){
        const parser = charExcept("");
        const result = parser('x123');
    
        assert.deepEqual(result, { value: 'x', rest: '123' });
    }) ;
    
    it('charExcept null',function(){
        const parser = charExcept("x");
        const result = parser('x123');
    
        assert('failed' in result);
    });
    
    it('charOneOF not null',function(){
        const parser = charOneOf("xyz");
        const result = parser('x123');
    
        assert.deepEqual(result, { value: 'x', rest: '123' });
    });

   it('charOneOF null',function(){
        const parser = charOneOf("xyz");
        const result = parser('123');
    
        assert('failed' in result);
    });

    it('charMeets not null',function(){
        const parser = charMeets(function(ch) { return ch === 'x'; });
        const result = parser('xyz');
    
        assert.deepEqual(result, { value: 'x', rest: 'yz' });
    });

    it('charMeets null',function(){
        const parser = charMeets(function(ch) { return false; });
        const result = parser('xyz');
    
        assert('failed' in result);
    });
    
    it('charIs("x") not null',function(){
        const parser = charIs('x');
        const result = parser('xyz');
    
        assert.deepEqual(result, { value: 'x', rest: 'yz' });
    });
    
    it('charIs("x") null',function(){
        const parser = charIs('x');
        const result = parser('1yz');
    
        assert('failed' in result);
    })
});

describe('all', function(){
    it('implicit `word`',function(){
        const parser = all('x','yy','x');
        const result = parser('xyyx and etc.');
        
        assert.deepEqual(result, {
            value: ['x','yy', 'x'],
            rest: ' and etc.'
        });
    });

    it('word not null',function(){
        const parser = word('text');
        const result = parser('text and etc.');
        
        assert.deepEqual(result, { value: 'text', rest: ' and etc.' });
    });

    it('word not null',function(){
        const parser = word('test');
        const result = parser('test and etc.');
        
        assert.deepEqual(result,{
            value:'test',
            rest:' and etc.'
        });
    });

    it('word null',function(){
        const parser = word('text');
        const result = parser('zzztext and etc.');
        
        assert('failed' in result);
    });
    
    it('between not null',function(){
        const parser = between(charIs('('), charOneOf('xyz'), charIs(')'));
        const result = parser('(x)xxx');
        
        assert.deepEqual(result, { value: 'x', rest: 'xxx' });
    });

    it('between null',function(){
        const parser = between(charIs('('), charOneOf('xyz'), charIs(')'));
        const result = parser('(1)xxx');
        
        assert('failed' in result);
    });

    it('between implicit `word`',function(){
        const parser = between('(', 'xyz', ')');
        const result = parser('(xyz)xxx');
        
        assert.deepEqual(result, {
            value:'xyz',
            rest:'xxx'
        });
    });

    it('first not null when match',function(){
        const parser = first(charOneOf('xyz'), charIs('/'));
        const result = parser('x/rest');
        
        assert.deepEqual(result,{
            value:'x',
            rest:'rest'
        });
    });

    it('first is null when no match',function(){
        const parser = first(charOneOf('xyz'), charIs('/'));
        const result = parser('k\\rest');
        
        assert('failed' in result);
    });

    it('second implicit `word`',function(){
        const parser = first('xyz', '/');
        const result = parser('xyz/rest');
        
        assert.deepEqual(result,{
            value:'xyz',
            rest:'rest'
        });
    });


    it('second not null when match',function(){
        const parser = second(charIs('\\'), charOneOf('xyz'));
        const result = parser('\\xxxx');
        
        assert.deepEqual(result, { value: 'x', rest: 'xxx' });
    });

    it('second is null when no match',function(){
        const parser = second(charIs('\\'), charOneOf('xyz'));
        const result = parser('/xxxx');
        
        assert('failed' in result);
    });

    it('second implicit `word`',function(){
        const parser = second('\\','xyz');
        const result = parser('\\xyzxxx');
        
        assert.deepEqual(result, {
            value:'xyz',
            rest:'xxx'
        });
    });
    
    it('all not null when match',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        const result = parser('xyz1rest');
        
        assert.deepEqual(result,{
            value:['x','y','z','1'],
            rest:'rest'
        });
    });

    it('all first null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        const result = parser('_yz1rest');
        
        assert('failed' in result);
    });

    it('all second null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        const result = parser('x_z1rest');
        
        assert('failed' in result);
    });
    
    it('all third null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        const result = parser('xy_1rest');
        
        assert('failed' in result);
    });
    
    it('all fourth null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        const result = parser('xyz_rest');
        
        assert('failed' in result);
    });

    it('all empty null',function(){
        const parser = all(charIs('x'),charIs('y'),charIs('z'),charIs('1'));
        const result = parser('');
        
        assert('failed' in result);
    })
});

describe('anyChar', function(){
    it('value and rest are not when match', function(){
        const parser = anyChar();
        const result = parser('123');
        
        assert.deepEqual(result, { value: '1', rest: '23' });
    });

    it('empty string should fail', function(){
        const parser = anyChar();
        const result = parser('');

        assert('failed' in result);
    });

    it('null should fail', function(){
        const parser = anyChar();
        const result = parser(null);

        assert('failed' in result);
    })
});

describe('foldLeft / foldRight', function() {
    const num = rep1(charOneOf('0123456789')).map(function(x){
        return parseInt(x.join(''));
    });
    const minus = charIs('-');

    it('foldLeft builds a left-leaning AST with the default apply', function(){
        const parser = foldLeft(num, minus);
        const result = parser('2-3-4');

        assert.deepEqual(result, { value: ['-', ['-', 2, 3], 4], rest: '' });
    });

    it('foldRight builds a right-leaning AST with the default apply', function(){
        const parser = foldRight(num, minus);
        const result = parser('2-3-4');

        assert.deepEqual(result, { value: ['-', 2, ['-', 3, 4]], rest: '' });
    });

    it('foldLeft folds left with a custom apply', function(){
        const parser = foldLeft(num, minus, function(op, a, b){ return a - b; });
        const result = parser('2-3-4');

        assert.deepEqual(result, { value: -5, rest: '' });
    });

    it('foldRight folds right with a custom apply', function(){
        const parser = foldRight(num, minus, function(op, a, b){ return a - b; });
        const result = parser('2-3-4');

        assert.deepEqual(result, { value: 3, rest: '' });
    });

    it('foldLeft/foldRight return the head unchanged for a single operand', function(){
        const left  = foldLeft(num, minus, function(op, a, b){ return a - b; });
        const right = foldRight(num, minus, function(op, a, b){ return a - b; });
        const resultLeft  = left('7');
        const resultRight = right('7');

        assert.deepEqual(resultLeft, { value: 7, rest: '' });
        assert.deepEqual(resultRight, { value: 7, rest: '' });
    });

    it('foldLeft validates its arguments', function(){
        // @ts-expect-error — foldLeft is deliberately called with one combinator
        assert.throws(function(){ foldLeft(word('a')); }, /accepts two combinators/);
    });

    it('foldLeft/foldRight validate the optional apply', function(){
        // @ts-expect-error — foldLeft is deliberately given a non-function
        assert.throws(function(){ foldLeft(word('a'), word('a'), 'nope'); }, /optional apply function/);
        // @ts-expect-error — foldRight is deliberately given a non-function
        assert.throws(function(){ foldRight(word('a'), word('a'), 'nope'); }, /optional apply function/);
    });
});

describe('errors', function(){
    it('carries the position and expected', function(){
        const parser = word('abc');
        const result = parser('abx');

        assert.deepEqual(result, { failed: true, pos: 2, expected: ['"c"'] });
    });

    it('or keeps the furthest failure and unions expectations', function(){
        const parser = or(word('ab'), word('ax'));
        const result = parser('az');

        assert.deepEqual(result, { failed: true, pos: 1, expected: ['"b"', '"x"'] });
    });

    it('all propagates the first failure', function(){
        const parser = all(charIs('a'), charIs('b'));
        const result = parser('ax');

        assert.deepEqual(result, { failed: true, pos: 1, expected: ['"b"'] });
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
