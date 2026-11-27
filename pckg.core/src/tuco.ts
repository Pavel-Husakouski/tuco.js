export type Cursor = { str: string; pos: number };
export type Fail = {
  failed: true;
  pos: number;
  expected: string[];
  /**
   * Set when parsing stopped because a resource limit was hit (input length,
   * step budget, depth budget or a caught `RangeError`) rather than because
   * the input did not match. Optional, so ordinary failures keep their shape.
   */
  limit?: boolean;
  /** 1-based line of `pos`, added at the public boundary. */
  line?: number;
  /** 1-based column of `pos`, counted in UTF-16 code units. */
  column?: number;
};
export type Success<T> = { value: T; rest: string };
export type Result<T> = Success<T> | Fail;
export interface Parser<T> {
  (input: string | null): Result<T>;
  map<U>(projection: (value: T) => U): Parser<U>;
}
export type Combinator = string | Parser<unknown>;

export type ValueOf<C> = C extends string
  ? string
  : C extends Parser<infer A>
    ? A
    : never;

export type ValuesOf<Cs extends Combinator[]> = {
  [K in keyof Cs]: ValueOf<Cs[K]>;
};

export type ScalarOrTuple<V extends any[]> = V extends [infer A] ? A : V;

export type RepValue<Cs extends Combinator[]> = Cs extends [infer C]
  ? ValueOf<C>[]
  : ValuesOf<Cs>[];

// Parsers are functions `rest -> { value, rest } | { failed, pos, expected }`.
// Internally the remaining input is a cursor `{ str, pos }`, so no substring
// is ever copied while parsing.  `__expose` converts the cursor back to a
// plain string only at the public boundary, which is O(n) once instead of
// O(n^2).  A failed parse carries the position it stopped at and what it
// expected there, instead of a bare `null`.
//
// Trust in the input is bounded at that boundary: inputs longer than
// `MAX_INPUT_LENGTH` are rejected before parsing, one parse may take at most
// `MAX_PARSE_STEPS` parser-entry steps and nest at most `MAX_PARSE_DEPTH`
// parser calls, and a `RangeError` escaping the parser (a stack overflow) is
// turned into an ordinary failure.  Every such failure is a normal `Fail`
// additionally marked with `limit: true`.

/** Longest accepted input, measured in UTF-16 code units. */
export const MAX_INPUT_LENGTH = 100000;

/** Maximum number of parser-entry steps for one top-level parse. */
export const MAX_PARSE_STEPS = 1000000;

/** Maximum nesting depth of parser calls for one top-level parse. */
export const MAX_PARSE_DEPTH = 1000;

const __INPUT_LIMIT_EXPECTED = "input length exceeds " + MAX_INPUT_LENGTH;
const __STEP_LIMIT_EXPECTED = "parse step budget exceeded";
const __DEPTH_LIMIT_EXPECTED = "parse depth budget exceeded";
const __OVERFLOW_EXPECTED = "parser runtime overflow";

type __Budget = { steps: number; depth: number; pos: number };

// Budget of the parse currently running; `null` outside a top-level parse.
// Parsing is synchronous, so a single module-level budget is enough; nested
// boundary calls (e.g. from a predicate) share the active budget.
let __budget: __Budget | null = null;

// Explicit null-or-undefined check (allowed spelling, see DESIGN.md).
function __isNil(x: any): boolean {
  return x === null || x === undefined;
}

function __isCursor(x: any): boolean {
  return (
    !__isNil(x) &&
    typeof x === "object" &&
    __isString(x.str) &&
    typeof x.pos === "number"
  );
}

function __toCursor(rest: any): Cursor {
  if (__isCursor(rest)) return rest;
  if (__isNil(rest)) return { str: "", pos: 0 };
  return { str: rest, pos: 0 };
}

function __materialize(result: any, input: string): any {
  if (__isNil(result)) return result;
  if (__isFail(result)) return __locateFail(result, input);
  return { value: result.value, rest: result.rest.str.slice(result.rest.pos) };
}

function __run(parser: (cursor: Cursor) => any, cursor: any): any {
  const budget = __budget;

  if (budget === null) return parser(cursor);

  budget.pos = cursor.pos;
  budget.steps += 1;

  if (budget.steps > MAX_PARSE_STEPS)
    return __fail(cursor.pos, __STEP_LIMIT_EXPECTED, true);

  budget.depth += 1;

  if (budget.depth > MAX_PARSE_DEPTH) {
    budget.depth -= 1;
    return __fail(cursor.pos, __DEPTH_LIMIT_EXPECTED, true);
  }

  try {
    return parser(cursor);
  } finally {
    budget.depth -= 1;
  }
}

// The furthest failure seen during the current top-level parse.  Backtracking
// combinators (`optional`, `rep0`, `or`) recover from a failure and try
// another path; remembering the deepest one lets the final error point at the
// real position instead of degrading to a shallower one (often
// `end of input`).  It is reset at the top-level boundary in `__expose`.
let __furthest: Fail | null = null;

function __expose<T>(parser: (cursor: Cursor) => any): Parser<T> {
  const exposed = function (rest: any): any {
    if (__isCursor(rest)) return __run(parser, rest);

    const own = __budget === null;
    const cursor = __toCursor(rest);

    if (cursor.str.length > MAX_INPUT_LENGTH) {
      if (own) __furthest = null;
      return __locateFail(
        __fail(cursor.pos, __INPUT_LIMIT_EXPECTED, true),
        cursor.str,
      );
    }

    if (own) {
      __budget = { steps: 0, depth: 0, pos: cursor.pos };
      __furthest = null;
    }

    try {
      return __materialize(
        __withFurthestFailure(__run(parser, cursor)),
        cursor.str,
      );
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;

      return __locateFail(
        __fail(
          __budget === null ? cursor.pos : __budget.pos,
          __OVERFLOW_EXPECTED,
          true,
        ),
        cursor.str,
      );
    } finally {
      if (own) __budget = null;
    }
  } as unknown as Parser<T>;

  Object.defineProperty(exposed, "map", {
    value: function <U>(projection: (value: T) => U): Parser<U> {
      return __expose<U>(__map(parser, projection));
    },
    enumerable: false,
    writable: true,
    configurable: true,
  });

  return exposed as unknown as Parser<T>;
}

function __map(parser: any, projection: any): any {
  __expect(__isFunction(projection), "`map` accepts projection function");

  return function _map(cursor: any) {
    const result = parser(cursor);

    return __isFail(result)
      ? result
      : { value: projection(result.value), rest: result.rest };
  };
}

function __fail(pos: number, expected: any, limit?: boolean): Fail {
  const failure: Fail = {
    failed: true,
    pos: pos,
    expected: Array.isArray(expected) ? expected : [expected],
  };

  if (limit === true) failure.limit = true;
  else __recordFailure(failure);

  return failure;
}

function __recordFailure(failure: Fail): void {
  // At equal positions the latest failure wins: a parser may replace a
  // low-level failure with a more precise one (e.g. `charMeets` over
  // `anyChar`).  Alternatives union their expectations in `__mergeFailures`.
  if (__furthest === null || failure.pos >= __furthest.pos)
    __furthest = failure;
}

// When the parse fails, report the furthest failure seen during it: a deeper
// failure recovered by backtracking is more informative than a shallow final
// one.  Equal positions merge their expectations (see `__mergeFailures`).
// Resource-limit failures are terminal and must surface unchanged.
function __withFurthestFailure(result: any): any {
  if (!__isFail(result) || __isLimit(result) || __furthest === null)
    return result;

  return __mergeFailures([result, __furthest]);
}

function __isFail(r: any): r is Fail {
  return !__isNil(r) && r.failed === true;
}

function __isLimit(r: any): boolean {
  return __isFail(r) && r.limit === true;
}

// Computes a 1-based `line` / `column` for `pos`. A line break is `\n`,
// `\r\n`, or a lone `\r`; positions are counted in UTF-16 code units.
function __locate(
  input: string,
  pos: number,
): { line: number; column: number } {
  const limit = Math.min(Math.max(pos, 0), input.length);
  let line = 1;
  let column = 1;

  for (let i = 0; i < limit; i++) {
    const ch = input.charAt(i);

    if (ch === "\r" && input.charAt(i + 1) === "\n") {
      // The pair is one line break once both units are before `pos`.
      if (i + 1 < limit) {
        line += 1;
        column = 1;
        i += 1;
      }
      continue;
    }

    if (ch === "\n" || ch === "\r") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line: line, column: column };
}

// Adds `line` / `column` to a failure at the public boundary, where the input
// string is known (internal parsers only carry a cursor).
function __locateFail(fail: Fail, input: string): Fail {
  const location = __locate(input, fail.pos);

  fail.line = location.line;
  fail.column = location.column;

  return fail;
}

/**
 * Renders a failure as a human-readable diagnostic: a summary, the offending
 * line, and a caret under the failure column.
 */
export function formatFail(fail: Fail, input: string): string {
  const source = __isString(input) ? input : "";
  const location = __locate(source, fail.pos);
  const line = fail.line === undefined ? location.line : fail.line;
  const column = fail.column === undefined ? location.column : fail.column;
  const lines = source.split(/\r\n|\r|\n/);
  const excerpt = lines[line - 1];
  const text = __isNil(excerpt) ? "" : excerpt;
  const label = String(line);
  const gutter = " ".repeat(label.length);
  const caret = " ".repeat(Math.max(column - 1, 0));

  return [
    "expected " +
      fail.expected.join(", ") +
      " at line " +
      line +
      ", column " +
      column,
    label + " | " + text,
    gutter + " | " + caret + "^",
  ].join("\n");
}

function __expect(checkResult: any, msg: string): void {
  if (checkResult) return;

  throw new Error(msg);
}

/** Matches a single character not present in `chars`. */
export function charExcept(chars: string): Parser<string> {
  __expect(__isString(chars), "`charExcept` accepts string");

  return charMeets(
    function (ch) {
      return chars.indexOf(ch) < 0;
    },
    'char except "' + chars + '"',
  );
}

/** Matches a single character present in `chars`. */
export function charOneOf(chars: string): Parser<string> {
  __expect(__isString(chars), "`charOneOf` accepts string");

  return charMeets(
    function (ch) {
      return chars.indexOf(ch) > -1;
    },
    'one of "' + chars + '"',
  );
}

/** Matches the single character `chr`. */
export function charIs(chr: string): Parser<string> {
  __expect(__isChar(chr), "`charIs` accepts single character");

  return charMeets(
    function (ch) {
      return ch === chr;
    },
    '"' + chr + '"',
  );
}

/** Matches one character satisfying `predicate`; `expected` names it in errors. */
export function charMeets(
  predicate: (ch: string) => boolean,
  expected?: string,
): Parser<string> {
  __expect(__isFunction(predicate), "`charMeets` accepts predicate");

  return __expose<string>(function (cursor: any) {
    const result = __anyChar(cursor);

    if (__isFail(result))
      return __fail(cursor.pos, __isNil(expected) ? "any character" : expected);
    if (!predicate(result.value))
      return __fail(
        cursor.pos,
        __isNil(expected) ? "char matching predicate" : expected,
      );
    return result;
  });
}

/** Matches any single character. */
export function anyChar(): Parser<string> {
  return __expose<string>(__anyChar);
}

function __anyChar(cursor: any): any {
  if (__isNil(cursor) || cursor.pos >= cursor.str.length)
    return __fail(__isNil(cursor) ? 0 : cursor.pos, "any character");

  return {
    value: cursor.str.charAt(cursor.pos),
    rest: { str: cursor.str, pos: cursor.pos + 1 },
  };
}

/** Matches two or more combinators in order; value is the array of their values. */
export function all<Cs extends Combinator[]>(
  ...combinators: Cs
): Parser<ValuesOf<Cs>> {
  __expect(
    __areCombinators(combinators) && combinators.length >= 2,
    "`all` accepts at least two combinators",
  );

  return __expose<any>(__all(combinators));
}

function __isChar(arg: any): boolean {
  return typeof arg === "string" && arg.length === 1;
}

function __isString(arg: any): boolean {
  return typeof arg === "string";
}

function __isFunction(arg: any): boolean {
  return typeof arg === "function";
}

function __areCombinators(array: any): boolean {
  return array.every(function (arg: any) {
    return __isFunction(arg) || __isString(arg);
  });
}

function __builtin(parsers: any): any {
  return parsers.map(function (parser: any) {
    if (__isString(parser)) return word(parser);

    return parser;
  });
}

function __all(combinators: any): any {
  const parsers = __builtin(combinators);

  // A single combinator is returned unwrapped, so the value is a scalar
  // rather than an array. Hence `optional(a)` → scalar, `optional(a, b)` →
  // [va, vb]; the same applies to rep1/rep0 (see DESIGN.md).
  if (parsers.length === 1) return parsers[0];

  return function (cursor: any) {
    const results: any[] = [];
    let result;
    let rest = cursor;

    for (let i = 0; i < parsers.length; i++) {
      result = parsers[i](rest);
      if (__isFail(result)) return result;
      results.push(result.value);
      rest = result.rest;
    }

    return {
      value: results,
      rest: result.rest,
    };
  };
}

/** Matches `a` then `b`; returns `a`'s value. */
export function first<A extends Combinator, B extends Combinator>(
  a: A,
  b: B,
): Parser<ValueOf<A>> {
  __expect(__areCombinators([a, b]), "`first` accepts two combinators");

  return all(a, b).map(function (v) {
    return v[0];
  });
}

/** Matches `a` then `b`; returns `b`'s value. */
export function second<A extends Combinator, B extends Combinator>(
  a: A,
  b: B,
): Parser<ValueOf<B>> {
  __expect(__areCombinators([a, b]), "`second` accepts two combinators");

  return all(a, b).map(function (v) {
    return v[1];
  });
}

/** Matches `a`, `b`, `c` in order; returns `b`'s value. */
export function between<
  A extends Combinator,
  B extends Combinator,
  C extends Combinator,
>(a: A, b: B, c: C): Parser<ValueOf<B>> {
  __expect(__areCombinators([a, b, c]), "`between` accepts three combinators");

  return all(a, b, c).map(function (v) {
    return v[1];
  });
}

/** Matches the literal string `text`. */
export function word(text: string): Parser<string> {
  __expect(
    __isString(text) && text.length > 0,
    "`word` accepts non-empty string",
  );

  // Match the literal directly against the cursor instead of building one
  // char parser per character. On failure, report the first mismatch (or the
  // first character past the end of input) exactly as `charIs` would.
  return __expose<string>(function (cursor: any) {
    if (cursor.str.startsWith(text, cursor.pos))
      return {
        value: text,
        rest: { str: cursor.str, pos: cursor.pos + text.length },
      };

    let offset = 0;

    while (
      offset < text.length &&
      cursor.pos + offset < cursor.str.length &&
      cursor.str.charAt(cursor.pos + offset) === text.charAt(offset)
    )
      offset += 1;

    return __fail(cursor.pos + offset, '"' + text.charAt(offset) + '"');
  });
}

function __rep1(parser: any): any {
  return function (cursor: any) {
    const value: any[] = [];
    let rest = cursor;

    for (;;) {
      const result = parser(rest);

      if (__isFail(result)) {
        if (__isLimit(result)) return result;
        if (value.length === 0) return result;
        return { value: value, rest: rest };
      }

      if (result.rest.pos === rest.pos)
        throw new Error("repetition parser matched empty input");

      value.push(result.value);
      rest = result.rest;
    }
  };
}

/** One or more repetitions; a single combinator yields a flat array, several yield a list of pairs. */
export function rep1<Cs extends Combinator[]>(
  ...combinators: Cs
): Parser<RepValue<Cs>> {
  __expect(
    __areCombinators(combinators) && combinators.length >= 1,
    "`rep1` accepts at least one combinator",
  );

  return __expose<any>(__rep1(__all(combinators)));
}

function __rep0(parser: any): any {
  const rep = __rep1(parser);

  return function (cursor: any) {
    const result = rep(cursor);

    if (!__isFail(result)) return result;

    return __isLimit(result) ? result : { value: [], rest: cursor };
  };
}

/** Zero or more repetitions; a single combinator yields a flat array, several yield a list of pairs. */
export function rep0<Cs extends Combinator[]>(
  ...combinators: Cs
): Parser<RepValue<Cs>> {
  __expect(
    __areCombinators(combinators) && combinators.length >= 1,
    "`rep0` accepts at least one combinator",
  );

  return __expose<any>(__rep0(__all(combinators)));
}

function __optional(parser: any): any {
  return function (cursor: any) {
    const result = parser(cursor);

    if (!__isFail(result)) return result;

    return __isLimit(result) ? result : { value: null, rest: cursor };
  };
}

/** Matches zero or one; a single combinator yields a scalar, several yield an array. */
export function optional<Cs extends Combinator[]>(
  ...combinators: Cs
): Parser<ScalarOrTuple<ValuesOf<Cs>> | null> {
  __expect(
    __areCombinators(combinators) && combinators.length >= 1,
    "`optional` accepts at least one combinator",
  );

  return __expose<any>(__optional(__all(combinators)));
}

// Packrat memo: an `or` is a pure function of the input and the position, so
// re-entering the same instance at the same position can reuse the result
// computed earlier instead of re-parsing a shared prefix.  The memo is keyed
// by position and dropped whenever the input string changes, so an instance
// stays correct when it is reused for another input.
function __memoize(run: any): any {
  let str: any = null;
  let memo = new Map<number, any>();

  return function (cursor: any) {
    if (__isNil(cursor)) return run(cursor);

    if (cursor.str !== str) {
      str = cursor.str;
      memo = new Map();
    }

    if (memo.has(cursor.pos)) {
      const cached = memo.get(cursor.pos);

      // `__furthest` is per top-level parse, while the memo outlives it; a
      // replayed failure must be recorded again or the deepest position would
      // be lost on a repeat parse of the same input.
      if (__isFail(cached) && !__isLimit(cached)) __recordFailure(cached);

      return cached;
    }

    const result = run(cursor);
    memo.set(cursor.pos, result);
    return result;
  };
}

function __or(parsers: any): any {
  return __memoize(function (cursor: any) {
    const failures: any[] = [];

    for (let i = 0; i < parsers.length; i++) {
      const result = parsers[i](cursor);

      if (!__isFail(result)) return result;
      if (__isLimit(result)) return result;
      failures.push(result);
    }

    return __mergeFailures(failures);
  });
}

function __mergeFailures(failures: any): any {
  let best = failures[0];

  for (let i = 1; i < failures.length; i++) {
    const f = failures[i];

    if (f.pos > best.pos) best = f;
    else if (f.pos === best.pos)
      best = __fail(best.pos, __union(best.expected, f.expected));
  }

  return best;
}

function __union(a: any, b: any): any {
  const out = a.slice();

  for (let i = 0; i < b.length; i++) if (out.indexOf(b[i]) < 0) out.push(b[i]);

  return out;
}

/** Tries combinators in order; keeps the furthest failure. */
export function or<Cs extends Combinator[]>(
  ...combinators: Cs
): Parser<ValuesOf<Cs>[number]> {
  __expect(
    __areCombinators(combinators) && combinators.length >= 2,
    "`or` accepts at least two combinators",
  );

  return __expose<any>(__or(__builtin(combinators)));
}

/** Defers parser creation until first use, enabling (mutual) recursion. */
export function defer<T>(thunk: () => Parser<T>): Parser<T> {
  __expect(__isFunction(thunk), "`defer` accepts a thunk function");

  return __expose<T>(function (cursor: any) {
    return thunk()(cursor);
  });
}

/** Succeeds with `null` only at end of input; otherwise fails at the current position. */
export function eof(): Parser<null> {
  return __expose<null>(function (cursor: any) {
    return cursor.pos >= cursor.str.length
      ? { value: null, rest: cursor }
      : __fail(cursor.pos, "end of input");
  });
}

/** Matches `parser` and then requires the end of input, returning `parser`'s value. */
export function complete<T>(parser: Parser<T>): Parser<T> {
  return first(parser, eof());
}

export default {
  all,
  anyChar,
  between,
  charExcept,
  charIs,
  charMeets,
  charOneOf,
  complete,
  defer,
  eof,
  optional,
  or,
  rep0,
  rep1,
  first,
  second,
  word,
};
