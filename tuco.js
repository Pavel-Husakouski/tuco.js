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
        second:second,
        word:word,
        nsImport:nsImport
    };

    function nsImport(name){
        var output='';

        for(var item in tuco){
            output += 'var ' + item + ' = '+name+ '.'+item + ';';
        }

        return output;
    };

    Function.prototype.map = function(projection)
    {
        if(arguments.length != 1)
            throw 'map accepts string';

        var parser = this;

        return function _map(rest) {
            var result = parser(rest);

            return result == null ? null : {value:projection(result.value), rest:result.rest};
        }
    };

    function charExcept(chars){
        if(arguments.length != 1)
            throw 'charExcept accepts string';

        return charMeets(function(ch) {
            return chars.indexOf(ch) < 0;
        });
    }

    function charOneOf(chars){
        if(arguments.length != 1)
            throw 'charOneOf accepts string';

        return charMeets(function(ch) {
            return chars.indexOf(ch) > -1;
        });
    }

    function charIs(chr){
        if(arguments.length != 1)
            throw 'char accepts single character';

        return charMeets(function(ch) {
            return ch == chr[0];
        });
    }

    function charMeets(predicate){
        if(arguments.length != 1)
            throw 'charMeet accepts predicate';

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
        return (!rest || rest.length == 0) ? null : {value:rest.slice(0,1), rest:rest.slice(1)};
    }

    function all(){
        if(arguments.length < 2)
            throw 'all accepts at least two parsers';

        return __all.apply(null, arguments);
    }

    function __isString(arg){
        return typeof(arg) == "string";
    }

    function __isFunction(arg){
        return typeof(arg) == "function";
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
        var parsers = __builtin(Array.prototype.slice.call(arguments));

        if(parsers.length == 1) {
            return parsers[0];
        }

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

            return {value:results, rest:result.rest};
        }
    }

    function second(first, second){
        if(arguments.length != 2)
            throw 'second accepts two parsers';

        first = __builtin(first);
        second = __builtin(second);

        return function _second(rest){
            var parser = all(first, second);
            var result = parser(rest);

            return result == null ? null : { value:result.value[1], rest:result.rest };
        }
    }

    function between(first, second, third){
        if(arguments.length != 3)
            throw 'between accepts three parsers';

        first = __builtin(first);
        second = __builtin(second);
        third = __builtin(third);


        return function _between(rest){
            var parser = all(first, second, third);
            var result = parser(rest);

            return result == null ? null : {value:result.value[1], rest:result.rest};
        }
    }

    function word(text){
        if(!text)
            throw 'word accepts non-empty string';

        if(text.length == 1)
            return charIs(text);

        return function _word(rest){
            var parsers = text.split('').map(function(ch) {
                return charIs(ch);
            });
            var parser = all.apply(null, parsers);
            var result = parser(rest);

            return result == null ? null : {value:text, rest:result.rest};
        }
    }

    function rep1(){
        if(arguments.length == 0)
            throw 'rep1 accepts parsers';

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
        if(arguments.length == 0)
            throw 'rep0 accepts parser';

        return optional(rep1.apply(null, arguments));
    }

    function optional(){
        if(arguments.length == 0)
            throw 'optional accepts parsers';

        var parser = __all.apply(null, arguments);

        return function _optional(rest){
            var result = parser(rest);

            return result == null ? {value:null, rest:rest} : result;
        }
    }

    function or(){
        if(arguments.length < 2)
            throw 'or accepts at least two parsers';

        var parsers = __builtin(Array.prototype.slice.call(arguments));

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
