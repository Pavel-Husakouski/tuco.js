var tuco  = (function(){
    'use strict';

    var tuco = {
        all:all,
        anyChar:anyChar,
        between:between,
        charExcept:charExcept,
        charIs:charIs,
        charMeets:charMeets,
        charOneOf:charOneOf,
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
            if(nsImport == 'nsImport')
                continue;

            output += 'var ' + item + ' = ' +name+ '.' +item + ';';
        }

        return output;
    };

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

        return function _charMeets(rest){
            var result = __anyChar(rest);

            if(!result || !predicate(result.value))
                return null;
            return result;
        }
    }

    function anyChar(){
        return function _anyChar(rest){
            return __anyChar(rest);
        }
    }

    function __anyChar(rest){
        return (!rest || rest.length == 0) ? null : { value:rest.slice(0,1), rest:rest.slice(1) };
    }

    function all(){
        __expect(__isCombinator.apply(null, __toArray(arguments)) && arguments.length >= 2, '`all` accepts at least two combinators');

        return __all.apply(null, arguments);
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

    function __isCombinator() {
        var args = __toArray(arguments);

        return args.every(function(arg){
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

        if(__isArray(parsers)) {
            return parsers.map(function(parser){
                if(__isString(parser)) 
                    return word(parser);

                return parser;
            });
        }
        
        return parsers;
    }

    function __all(){
        var parsers = __builtin(__toArray(arguments));

        if(parsers.length == 1)
            return parsers[0];

        return function _all(rest){
            var results = [];
            var result;

            for(var i in parsers){
                result = parsers[i](rest);
                if(result == null)
                    return null;
                results.push(result.value);
                rest = result.rest;
            }

            return { value:results, rest:result.rest };
        }
    }

    function first(first, second){
        __expect(__isCombinator(first, second), '`first` accepts two combinators');

        return __all(first, second).map(function(value){
            return value[0];
        });
    }

    function second(first, second){
        __expect(__isCombinator(first, second), '`second` accepts two combinators');

        return __all(first, second).map(function(value){
            return value[1];
        });
    }

    function between(first, second, third){
        __expect(__isCombinator(first, second, third), '`between` accepts three combinators');

        return __all(first, second, third).map(function(value){
            return value[1];
        });
    }

    function word(text){
        __expect(__isString(text), '`word` accepts non-empty string');

        if(text.length == 1)
            return charIs(text);

        return __all.apply(null, text.split('')).map(function(value){
            return text;
        });
    }

    function rep1() {
        __expect(__isCombinator.apply(null, __toArray(arguments)), '`rep1` accepts at least one combinator');

        var parser = __all.apply(null, arguments);

        return function _rep1(rest){
            var result1 = parser(rest);

            if(result1 == null)
                return null;
            var result0 = rep0(parser)(result1.rest);
            var value = [result1.value].concat(result0.value);

            if(result0.value == null)
                value = value.slice(0,-1);

            return {value:value, rest:result0.rest};
        }
    }

    function rep0(){
        __expect(__isCombinator.apply(null, __toArray(arguments)), '`rep0` accepts at least one combinator');

        return optional(rep1.apply(null, arguments));
    }

    function optional(){
        __expect(__isCombinator.apply(null, __toArray(arguments)), '`optional` accepts at least one combinator');

        var parser = __all.apply(null, arguments);

        return function _optional(rest){
            var result = parser(rest);

            return result == null ? {value:null, rest:rest} : result;
        }
    }

    function or(){
        __expect(__isCombinator.apply(null, __toArray(arguments)) && arguments.length >= 2, '`or` accepts at least two combinators');

        var parsers = __builtin(__toArray(arguments));

        return function _or(rest){
            for(var i in parsers){
                var result = parsers[i](rest);

                if(result != null)
                    return result;
            }
            return null;
        }
    }

    if(typeof module != 'undefined') {
        module.exports = tuco;
    }

    return tuco;
})();