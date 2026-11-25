var tuco  = (function(){
    'use strict';

    var tuco = {
        all:all,
        anyChar:anyChar,
        between:between,
        chain:chain,
        charExcept:charExcept,
        charIs:charIs,
        charMeets:charMeets,
        charOneOf:charOneOf,
        foldl:foldl,
        foldr:foldr,
        optional:optional,
        or:or,
        rep0:rep0,
        rep1:rep1,
        first:first,
        second:second,
        word:word
    };

    // Parsers are functions `rest -> { value, rest } | { failed, pos, expected }`.
    // Internally the remaining input is a cursor `{ str, pos }`, so no substring
    // is ever copied while parsing.  `__expose` converts the cursor back to a
    // plain string only at the public boundary, which is O(n) once instead of
    // O(n^2).  A failed parse carries the position it stopped at and what it
    // expected there, instead of a bare `null`.

    function __isCursor(x){
        return x != null && typeof x === 'object' && __isString(x.str) && typeof x.pos === 'number';
    }

    function __toCursor(rest){
        if(__isCursor(rest) || rest == null)
            return rest;
        return { str: rest, pos: 0 };
    }

    function __materialize(result){
        if(result == null || __isFail(result))
            return result;
        return { value: result.value, rest: result.rest.str.slice(result.rest.pos) };
    }

    function __expose(parser){
        var exposed = function(rest){
            if(__isCursor(rest))
                return parser(rest);
            return __materialize(parser(__toCursor(rest)));
        };

        exposed.map = function(projection){
            return __expose(__map(parser, projection));
        };

        return exposed;
    }

    function __map(parser, projection){
        __expect(__isFunction(projection), '`map` accepts projection function');

        return function _map(cursor){
            var result = parser(cursor);

            return __isFail(result) ? result : { value: projection(result.value), rest: result.rest };
        };
    }

    function __fail(pos, expected){
        return { failed: true, pos: pos, expected: __isArray(expected) ? expected : [expected] };
    }

    function __isFail(result){
        return result != null && result.failed === true;
    }

    function __expect(checkResult, msg){
        if(checkResult)
            return;

        throw new Error(msg);
    }

    function charExcept(chars){
        __expect(__isString(chars), '`charExcept` accepts string');

        return charMeets(function(ch) {
            return chars.indexOf(ch) < 0;
        }, 'char except "' + chars + '"');
    }

    function charOneOf(chars){
        __expect(__isString(chars), '`charOneOf` accepts string');

        return charMeets(function(ch) {
            return chars.indexOf(ch) > -1;
        }, 'one of "' + chars + '"');
    }

    function charIs(chr){
        __expect(__isChar(chr), '`charIs` accepts single character');

        return charMeets(function(ch) {
            return ch == chr;
        }, '"' + chr + '"');
    }

    function charMeets(predicate, expected){
        __expect(__isFunction(predicate), '`charMeets` accepts predicate');

        return __expose(function(cursor){
            var result = __anyChar(cursor);

            if(__isFail(result))
                return result;
            if(!predicate(result.value))
                return __fail(cursor.pos, expected == null ? 'char matching predicate' : expected);
            return result;
        });
    }

    function anyChar(){
        return __expose(__anyChar);
    }

    function __anyChar(cursor){
        if(cursor == null || cursor.pos >= cursor.str.length)
            return __fail(cursor == null ? 0 : cursor.pos, 'any character');

        return { value: cursor.str.charAt(cursor.pos), rest: { str: cursor.str, pos: cursor.pos + 1 } };
    }

    function all(){
        var args = __toArray(arguments);

        __expect(__areCombinators(args) && args.length >= 2, '`all` accepts at least two combinators');

        return __expose(__all(args));
    }

    function __isChar(arg){
        return typeof(arg) == "string" && arg.length == 1;
    }

    function __isString(arg){
        return typeof(arg) == "string";
    }

    function __isFunction(arg){
        return typeof(arg) == "function";
    }

    function __areCombinators(array) {
        return array.every(function(arg){
            return __isFunction(arg) || __isString(arg);
        });
    }

    function __toArray(args){
        return Array.prototype.slice.call(args);
    }

    function __isArray(arg){
        return Object.prototype.toString.call(arg) == '[object Array]';
    }

    function __builtin(parsers){
        if(__isString(parsers))
            return word(parsers);

        if(!__isArray(parsers)) {
            return parsers;
        }

        return parsers.map(function(parser){
            if(__isString(parser))
                return word(parser);

            return parser;
        });
    }

    function __all(combinators, indexToTake){
        var parsers = __builtin(combinators);

        // Один комбинатор возвращается без обёртки: результат будет скаляром,
        // а не массивом. Отсюда `optional(a)` → скаляр, `optional(a, b)` →
        // [va, vb]; то же касается rep1/rep0 (см. DESIGN.md).
        if(parsers.length == 1)
            return parsers[0];

        return function(cursor){
            var results = [];
            var result;
            var rest = cursor;

            for(var i = 0; i < parsers.length; i++){
                result = parsers[i](rest);
                if(__isFail(result))
                    return result;
                results.push(result.value);
                rest = result.rest;
            }

            return { value: indexToTake == null ? results : results[indexToTake], rest: result.rest };
        }
    }

    function first(first, second){
        __expect(__areCombinators([first, second]), '`first` accepts two combinators');

        return __expose(__all([first, second], 0));
    }

    function second(first, second){
        __expect(__areCombinators([first, second]), '`second` accepts two combinators');

        return __expose(__all([first, second], 1));
    }

    function between(first, second, third){
        __expect(__areCombinators([first, second, third]), '`between` accepts three combinators');

        return __expose(__all([first, second, third], 1));
    }

    function word(text){
        __expect(__isString(text) && text.length > 0, '`word` accepts non-empty string');

        if(text.length == 1)
            return charIs(text);

        return __expose(__all(text.split(''))).map(function(value){
            return text;
        });
    }

    function __rep1(parser){
        return function(cursor){
            var result1 = parser(cursor);

            if(__isFail(result1))
                return result1;

            var result0 = __rep0(parser)(result1.rest);
            var value = [result1.value].concat(result0.value == null ? [] : result0.value);

            return {value:value, rest:result0.rest};
        }
    }

    function rep1() {
        var args = __toArray(arguments);

        __expect(__areCombinators(args) && args.length >= 1, '`rep1` accepts at least one combinator');

        return __expose(__rep1(__all(args)));
    }

    function __rep0(parser){
        return __optional(__rep1(parser));
    }

    function rep0(){
        var args = __toArray(arguments);

        __expect(__areCombinators(args) && args.length >= 1, '`rep0` accepts at least one combinator');

        return __expose(__rep0(__all(args)));
    }

    function __optional(parser){
        return function(cursor){
            var result = parser(cursor);

            return __isFail(result) ? {value:null, rest:cursor} : result;
        }
    }

    function optional(){
        var args = __toArray(arguments);

        __expect(__areCombinators(args) && args.length >= 1, '`optional` accepts at least one combinator');

        return __expose(__optional(__all(args)));
    }

    function __or(parsers){
        return function(cursor){
            var failures = [];

            for(var i = 0; i < parsers.length; i++){
                var result = parsers[i](cursor);

                if(!__isFail(result))
                    return result;
                failures.push(result);
            }

            return __mergeFailures(failures);
        }
    }

    function __mergeFailures(failures){
        var best = failures[0];

        for(var i = 1; i < failures.length; i++){
            var f = failures[i];

            if(f.pos > best.pos)
                best = f;
            else if(f.pos === best.pos)
                best = __fail(best.pos, __union(best.expected, f.expected));
        }

        return best;
    }

    function __union(a, b){
        var out = a.slice();

        for(var i = 0; i < b.length; i++)
            if(out.indexOf(b[i]) < 0)
                out.push(b[i]);

        return out;
    }

    function or(){
        var args = __toArray(arguments);

        __expect(__areCombinators(args) && args.length >= 2, '`or` accepts at least two combinators');

        return __expose(__or(__builtin(args)));
    }

    function chain(operand, operator){
        __expect(__areCombinators([operand, operator]), '`chain` accepts two combinators');

        var o = __builtin(operand);
        var p = __builtin(operator);

        return __expose(__all([o, __rep0(__all([p, o]))]));
    }

    function __defaultApply(op, left, right){
        return [op, left, right];
    }

    function foldl(apply){
        __expect(apply == null || __isFunction(apply), '`foldl` accepts an optional apply function');
        apply = apply || __defaultApply;

        return function _foldl(v){
            var acc = v[0];
            var pairs = v[1] == null ? [] : v[1];

            for(var i = 0; i < pairs.length; i++)
                acc = apply(pairs[i][0], acc, pairs[i][1]);

            return acc;
        };
    }

    function foldr(apply){
        __expect(apply == null || __isFunction(apply), '`foldr` accepts an optional apply function');
        apply = apply || __defaultApply;

        return function _foldr(v){
            var pairs = v[1] == null ? [] : v[1];

            if(pairs.length == 0)
                return v[0];

            var acc = pairs[pairs.length - 1][1];

            for(var i = pairs.length - 1; i >= 0; i--)
                acc = apply(pairs[i][0], i == 0 ? v[0] : pairs[i - 1][1], acc);

            return acc;
        };
    }

    return tuco;
})();

export default tuco;
export const {
    all, anyChar, between, chain, charExcept, charIs, charMeets, charOneOf,
    foldl, foldr, optional, or, rep0, rep1, first, second, word
} = tuco;
