export type Cursor = { str: string; pos: number };
export type Fail = { failed: true; pos: number; expected: string[] };
export type Success<T> = { value: T; rest: string };
export type Result<T> = Success<T> | Fail;
export interface Parser<T> {
    (input: string | null): Result<T>;
    map<U>(projection: (value: T) => U): Parser<U>;
}
export type Combinator<A = any> = string | ((input: string | null) => Result<A>);

export type ValueOf<C> =
    C extends string ? string
    : C extends Parser<infer A> ? A
    : any;

export type ValuesOf<Cs extends Combinator[]> = { [K in keyof Cs]: ValueOf<Cs[K]> };

export type ScalarOrTuple<V extends any[]> = V extends [infer A] ? A : V;

export type RepValue<Cs extends Combinator[]> = Cs extends [infer C] ? ValueOf<C>[] : ValuesOf<Cs>[];

// Parsers are functions `rest -> { value, rest } | { failed, pos, expected }`.
// Internally the remaining input is a cursor `{ str, pos }`, so no substring
// is ever copied while parsing.  `__expose` converts the cursor back to a
// plain string only at the public boundary, which is O(n) once instead of
// O(n^2).  A failed parse carries the position it stopped at and what it
// expected there, instead of a bare `null`.

function __isCursor(x: any): boolean {
    return x != null && typeof x === 'object' && __isString(x.str) && typeof x.pos === 'number';
}

function __toCursor(rest: any): any {
    if(__isCursor(rest) || rest == null)
        return rest;
    return { str: rest, pos: 0 };
}

function __materialize(result: any): any {
    if(result == null || __isFail(result))
        return result;
    return { value: result.value, rest: result.rest.str.slice(result.rest.pos) };
}

function __expose<T>(parser: (cursor: Cursor) => any): Parser<T> {
    const exposed = (function(rest: any): any {
        if (__isCursor(rest)) return parser(rest);
        return __materialize(parser(__toCursor(rest)));
    }) as unknown as Parser<T>;
    exposed.map = function<U>(projection: (value: T) => U): Parser<U> {
        return __expose<U>(__map(parser, projection));
    };
    return exposed;
}

function __map(parser: any, projection: any): any {
    __expect(__isFunction(projection), '`map` accepts projection function');

    return function _map(cursor: any){
        const result = parser(cursor);

        return __isFail(result) ? result : { value: projection(result.value), rest: result.rest };
    };
}

function __fail(pos: number, expected: any): Fail {
    return { failed: true, pos: pos, expected: __isArray(expected) ? expected : [expected] };
}

function __isFail(r: any): r is Fail {
    return r != null && r.failed === true;
}

function __expect(checkResult: any, msg: string): void {
    if(checkResult)
        return;

    throw new Error(msg);
}

/** Matches a single character not present in `chars`. */
export function charExcept(chars: string): Parser<string> {
    __expect(__isString(chars), '`charExcept` accepts string');

    return charMeets(function(ch) {
        return chars.indexOf(ch) < 0;
    }, 'char except "' + chars + '"');
}

/** Matches a single character present in `chars`. */
export function charOneOf(chars: string): Parser<string> {
    __expect(__isString(chars), '`charOneOf` accepts string');

    return charMeets(function(ch) {
        return chars.indexOf(ch) > -1;
    }, 'one of "' + chars + '"');
}

/** Matches the single character `chr`. */
export function charIs(chr: string): Parser<string> {
    __expect(__isChar(chr), '`charIs` accepts single character');

    return charMeets(function(ch) {
        return ch == chr;
    }, '"' + chr + '"');
}

/** Matches one character satisfying `predicate`; `expected` names it in errors. */
export function charMeets(predicate: (ch: string) => boolean, expected?: string): Parser<string> {
    __expect(__isFunction(predicate), '`charMeets` accepts predicate');

    return __expose<string>(function(cursor: any){
        const result = __anyChar(cursor);

        if(__isFail(result))
            return result;
        if(!predicate(result.value))
            return __fail(cursor.pos, expected == null ? 'char matching predicate' : expected);
        return result;
    });
}

/** Matches any single character. */
export function anyChar(): Parser<string> {
    return __expose<string>(__anyChar);
}

function __anyChar(cursor: any): any {
    if(cursor == null || cursor.pos >= cursor.str.length)
        return __fail(cursor == null ? 0 : cursor.pos, 'any character');

    return { value: cursor.str.charAt(cursor.pos), rest: { str: cursor.str, pos: cursor.pos + 1 } };
}

/** Matches two or more combinators in order; value is the array of their values. */
export function all<Cs extends Combinator[]>(...combinators: Cs): Parser<ValuesOf<Cs>> {
    __expect(__areCombinators(combinators) && combinators.length >= 2, '`all` accepts at least two combinators');

    return __expose<any>(__all(combinators));
}

function __isChar(arg: any): boolean {
    return typeof(arg) == "string" && arg.length == 1;
}

function __isString(arg: any): boolean {
    return typeof(arg) == "string";
}

function __isFunction(arg: any): boolean {
    return typeof(arg) == "function";
}

function __areCombinators(array: any): boolean {
    return array.every(function(arg: any){
        return __isFunction(arg) || __isString(arg);
    });
}

function __isArray(arg: any): boolean {
    return Object.prototype.toString.call(arg) == '[object Array]';
}

function __builtin(parsers: any): any {
    if(__isString(parsers))
        return word(parsers);

    if(!__isArray(parsers)) {
        return parsers;
    }

    return parsers.map(function(parser: any){
        if(__isString(parser))
            return word(parser);

        return parser;
    });
}

function __all(combinators: any, indexToTake?: any): any {
    const parsers = __builtin(combinators);

    // A single combinator is returned unwrapped, so the value is a scalar
    // rather than an array. Hence `optional(a)` → scalar, `optional(a, b)` →
    // [va, vb]; the same applies to rep1/rep0 (see DESIGN.md).
    if(parsers.length == 1)
        return parsers[0];

    return function(cursor: any){
        const results: any[] = [];
        let result;
        let rest = cursor;

        for(let i = 0; i < parsers.length; i++){
            result = parsers[i](rest);
            if(__isFail(result))
                return result;
            results.push(result.value);
            rest = result.rest;
        }

        return { value: indexToTake == null ? results : results[indexToTake], rest: result.rest };
    }
}

/** Matches `a` then `b`; returns `a`'s value. */
export function first<A extends Combinator, B extends Combinator>(a: A, b: B): Parser<ValueOf<A>> {
    __expect(__areCombinators([a, b]), '`first` accepts two combinators');

    return __expose<any>(__all([a, b], 0));
}

/** Matches `a` then `b`; returns `b`'s value. */
export function second<A extends Combinator, B extends Combinator>(a: A, b: B): Parser<ValueOf<B>> {
    __expect(__areCombinators([a, b]), '`second` accepts two combinators');

    return __expose<any>(__all([a, b], 1));
}

/** Matches `a`, `b`, `c` in order; returns `b`'s value. */
export function between<A extends Combinator, B extends Combinator, C extends Combinator>(a: A, b: B, c: C): Parser<ValueOf<B>> {
    __expect(__areCombinators([a, b, c]), '`between` accepts three combinators');

    return __expose<any>(__all([a, b, c], 1));
}

/** Matches the literal string `text`. */
export function word(text: string): Parser<string> {
    __expect(__isString(text) && text.length > 0, '`word` accepts non-empty string');

    if(text.length == 1)
        return charIs(text);

    return __expose<any>(__all(text.split(''))).map(function(value: any){
        return text;
    });
}

function __rep1(parser: any): any {
    return function(cursor: any){
        const result1 = parser(cursor);

        if(__isFail(result1))
            return result1;

        const result0 = __rep0(parser)(result1.rest);
        const value = [result1.value].concat(result0.value == null ? [] : result0.value);

        return {value:value, rest:result0.rest};
    }
}

/** One or more repetitions; a single combinator yields a flat array, several yield a list of pairs. */
export function rep1<Cs extends Combinator[]>(...combinators: Cs): Parser<RepValue<Cs>> {
    __expect(__areCombinators(combinators) && combinators.length >= 1, '`rep1` accepts at least one combinator');

    return __expose<any>(__rep1(__all(combinators)));
}

function __rep0(parser: any): any {
    return __optional(__rep1(parser));
}

/** Zero or more repetitions; a single combinator yields a flat array (or null), several yield a list of pairs. */
export function rep0<Cs extends Combinator[]>(...combinators: Cs): Parser<RepValue<Cs> | null> {
    __expect(__areCombinators(combinators) && combinators.length >= 1, '`rep0` accepts at least one combinator');

    return __expose<any>(__rep0(__all(combinators)));
}

function __optional(parser: any): any {
    return function(cursor: any){
        const result = parser(cursor);

        return __isFail(result) ? {value:null, rest:cursor} : result;
    }
}

/** Matches zero or one; a single combinator yields a scalar, several yield an array. */
export function optional<Cs extends Combinator[]>(...combinators: Cs): Parser<ScalarOrTuple<ValuesOf<Cs>> | null> {
    __expect(__areCombinators(combinators) && combinators.length >= 1, '`optional` accepts at least one combinator');

    return __expose<any>(__optional(__all(combinators)));
}

function __or(parsers: any): any {
    return function(cursor: any){
        const failures: any[] = [];

        for(let i = 0; i < parsers.length; i++){
            const result = parsers[i](cursor);

            if(!__isFail(result))
                return result;
            failures.push(result);
        }

        return __mergeFailures(failures);
    }
}

function __mergeFailures(failures: any): any {
    let best = failures[0];

    for(let i = 1; i < failures.length; i++){
        const f = failures[i];

        if(f.pos > best.pos)
            best = f;
        else if(f.pos === best.pos)
            best = __fail(best.pos, __union(best.expected, f.expected));
    }

    return best;
}

function __union(a: any, b: any): any {
    const out = a.slice();

    for(let i = 0; i < b.length; i++)
        if(out.indexOf(b[i]) < 0)
            out.push(b[i]);

    return out;
}

/** Tries combinators in order; keeps the furthest failure. */
export function or<Cs extends Combinator[]>(...combinators: Cs): Parser<ValuesOf<Cs>[number]> {
    __expect(__areCombinators(combinators) && combinators.length >= 2, '`or` accepts at least two combinators');

    return __expose<any>(__or(__builtin(combinators)));
}

// Parses `operand (operator operand)*`, returning `[head, pairs]`.
function __chain(operand: any, operator: any): any {
    __expect(__areCombinators([operand, operator]), 'accepts two combinators');

    const o = __builtin(operand);
    const p = __builtin(operator);

    return __expose<any>(__all([o, __rep0(__all([p, o]))]));
}

function __defaultApply(op: any, left: any, right: any): any {
    return [op, left, right];
}

// Left fold over a chain's `[head, pairs]`; default apply is `(op, a, b) => [op, a, b]`.
function __foldl(apply?: any): any {
    __expect(apply == null || __isFunction(apply), 'accepts an optional apply function');
    apply = apply || __defaultApply;

    return function _foldl(v: any){
        let acc = v[0];
        const pairs = v[1] == null ? [] : v[1];

        for(let i = 0; i < pairs.length; i++)
            acc = apply!(pairs[i][0], acc, pairs[i][1]);

        return acc;
    };
}

// Right fold over a chain's `[head, pairs]`; default apply is `(op, a, b) => [op, a, b]`.
function __foldr(apply?: any): any {
    __expect(apply == null || __isFunction(apply), 'accepts an optional apply function');
    apply = apply || __defaultApply;

    return function _foldr(v: any){
        const pairs = v[1] == null ? [] : v[1];

        if(pairs.length == 0)
            return v[0];

        let acc = pairs[pairs.length - 1][1];

        for(let i = pairs.length - 1; i >= 0; i--)
            acc = apply!(pairs[i][0], i == 0 ? v[0] : pairs[i - 1][1], acc);

        return acc;
    };
}

/** Parses `operand (operator operand)*`, left-folding the operators into the value. */
export function foldLeft<O extends Combinator, P extends Combinator>(operand: O, operator: P): Parser<any>;
export function foldLeft<O extends Combinator, P extends Combinator, A = any>(
    operand: O, operator: P,
    apply: (op: ValueOf<P>, left: A, right: ValueOf<O>) => A
): Parser<A>;
export function foldLeft(operand: any, operator: any, apply?: any): Parser<any> {
    return __chain(operand, operator).map(__foldl(apply));
}

/** Parses `operand (operator operand)*`, right-folding the operators into the value. */
export function foldRight<O extends Combinator, P extends Combinator>(operand: O, operator: P): Parser<any>;
export function foldRight<O extends Combinator, P extends Combinator, A = any>(
    operand: O, operator: P,
    apply: (op: ValueOf<P>, left: ValueOf<O>, right: A) => A
): Parser<A>;
export function foldRight(operand: any, operator: any, apply?: any): Parser<any> {
    return __chain(operand, operator).map(__foldr(apply));
}

export default { all, anyChar, between, charExcept, charIs, charMeets, charOneOf, foldLeft, foldRight, optional, or, rep0, rep1, first, second, word };
