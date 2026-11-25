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
        word:word,
        nsImport:nsImport
    };

    function nsImport(name){
        var output='';

        for(var item in tuco){
            if(!tuco.hasOwnProperty(item) || item == 'nsImport')
                continue;

            output += 'var ' + item + ' = ' +name+ '.' +item + ';';
        }

        return output;
    };

    // Parsers are functions `rest -> { value, rest } | null`.  Internally the
    // remaining input is a cursor `{ str, pos }`, so no substring is ever
    // copied while parsing.  `__expose` converts the cursor back to a plain
    // string only at the public boundary, which is O(n) once instead of O(n^2).

    function __isCursor(x){
        return x != null && typeof x === 'object' && __isString(x.str) && typeof x.pos === 'number';
    }

    function __toCursor(rest){
        if(__isCursor(rest) || rest == null)
            return rest;
        return { str: rest, pos: 0 };
    }

    function __materialize(result){
        if(result == null)
            return null;
        return { value: result.value, rest: result.rest.str.slice(result.rest.pos) };
    }

    function __expose(parser){
        return function(rest){
            if(__isCursor(rest))
                return parser(rest);
            return __materialize(parser(__toCursor(rest)));
        };
    }

    Function.prototype.map = function(projection) {
        __expect(__isFunction(projection), '`map` accepts projection function');

        var parser = this;

        return function _map(rest) {
            var result = parser(rest);

            return result == null ? null : { value:projection(result.value), rest:result.rest };
        };
    };

    function __expect(checkResult, msg){
        if(checkResult)
            return;

        throw new Error(msg);
    }

    function charExcept(chars){
        __expect(__isString(chars), '`charExcept` accepts string');

        return charMeets(function(ch) {
            return chars.indexOf(ch) < 0;
        });
    }

    function charOneOf(chars){
        __expect(__isString(chars), '`charOneOf` accepts string');

        return charMeets(function(ch) {
            return chars.indexOf(ch) > -1;
        });
    }

    function charIs(chr){
        __expect(__isChar(chr), '`charIs` accepts single character');

        return charMeets(function(ch) {
            return ch == chr;
        });
    }

    function charMeets(predicate){
        __expect(__isFunction(predicate), '`charMeets` accepts predicate');

        return __expose(function(cursor){
            var result = __anyChar(cursor);

            if(!result || !predicate(result.value))
                return null;
            return result;
        });
    }

    function anyChar(){
        return __expose(__anyChar);
    }

    function __anyChar(cursor){
        if(cursor == null || cursor.pos >= cursor.str.length)
            return null;

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

        if(parsers.length == 1)
            return parsers[0];

        return function(cursor){
            var results = [];
            var result;
            var rest = cursor;

            for(var i = 0; i < parsers.length; i++){
                result = parsers[i](rest);
                if(result == null)
                    return null;
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

            if(result1 == null)
                return null;

            var result0 = __rep0(parser)(result1.rest);
            var value = [result1.value].concat(result0.value);

            if(result0.value == null)
                value = value.slice(0,-1);

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

            return result == null ? {value:null, rest:cursor} : result;
        }
    }

    function optional(){
        var args = __toArray(arguments);

        __expect(__areCombinators(args) && args.length >= 1, '`optional` accepts at least one combinator');

        return __expose(__optional(__all(args)));
    }

    function __or(parsers){
        return function(cursor){
            for(var i = 0; i < parsers.length; i++){
                var result = parsers[i](cursor);

                if(result != null)
                    return result;
            }
            return null;
        }
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

    if(typeof module != 'undefined') {
        module.exports = tuco;
    }

    return tuco;
})();
