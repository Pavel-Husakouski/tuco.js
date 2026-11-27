In memories of Tuco Benedicto Pacifico Juan Maria Ramirez and Eli Herschel Wallach

![Eli Wallach](https://raw.githubusercontent.com/Pavel-Husakouski/tuco.js/master/img/eli_wallach.jpg "Tuco Benedicto Pacifico Juan Maria Ramirez and Eli Herschel Wallach")

# tuco

Minimalist library to use with simple query grammars, built on parser combinators. Written in TypeScript: source lives in `src/`, compiled to `lib/`.

- **ESM-only.** The package has `"type": "module"` and exposes only ESM entry points, so use `import`, not `require()`. Node.js >= 20.19 is required.
- **`rep0` returns `[]` for zero matches**, never `null`. The only combinators that produce `null` are `optional` (when its input does not match) and `eof` (on success).

## Install

```sh
npm install @beeff/tuco
```

```ts
import { or, word } from "@beeff/tuco";

const parser = or(word("first"), word("second"));

parser("secondfirst");
// { value: "second", rest: "first" }
```

Every combinator position that expects a parser also accepts a string, which is shorthand for `word(text)`:

```ts
or("first", "second"); // same as or(word("first"), word("second"))
```

The default export is the same set of functions as named exports:

```ts
import tuco from "@beeff/tuco";

tuco.word("x")("xy"); // { value: "x", rest: "y" }
```

## Parser model

```ts
type Success<T> = { value: T; rest: string };
type Fail = { failed: true; pos: number; expected: string[] };
type Result<T> = Success<T> | Fail;

interface Parser<T> {
  (input: string | null): Result<T>;
  map<U>(projection: (value: T) => U): Parser<U>;
}

type Combinator = string | Parser<unknown>;
```

A parser is a function from the remaining input to a result. On success it returns the parsed `value` plus the unconsumed `rest`; on failure it returns `failed: true`, the position where parsing stopped (`pos`), and the list of expected items (`expected`). A `null` input is treated as the empty string.

Every parser also has `.map(projection)`, which transforms a successful value and leaves a failure untouched.

```ts
const parser = all(word("first"), word("second")).map(function (values) {
  return values.join(".");
});

parser("firstsecondrest");
// { value: "first.second", rest: "rest" }
```

### Value shapes at a glance

The value depends on how many combinators are passed:

- `all(a, b, ...)` always returns an array of values.
- `optional(a)` returns the scalar value of `a`, or `null`; `optional(a, b)` returns the array `[valueA, valueB]`, or `null`. This asymmetry is deliberate.
- `rep1(a)` and `rep0(a)` return a flat array `[va, va, ...]`; `rep1(a, b)` and `rep0(a, b)` return a list of arrays `[[va, vb], ...]`.
- `rep1` fails when it matches nothing; `rep0` succeeds with `[]`.
- `or`, `first`, `second`, `between`, `word`, the character parsers, `defer`, and `complete` return a single value (whatever the selected inner parser produced), without an extra wrapper array.
- `eof` returns `null`.

### Repetition and limits

- `rep1` and `rep0` throw an `Error` when their inner parser succeeds without consuming input, which prevents infinite loops.
- Ordered choice (`or`) backtracks without memoization, so nested or shared-prefix alternatives can cost O(2^k) in the worst case. Keep grammars left-factored and unambiguous.
- "Character" means a UTF-16 code unit. The character parsers and `word` operate on code units, so an astral character is two units: `charIs("😀")` is rejected, while `word("😀")` matches it.
- Parsing is synchronous and unbounded. Callers of untrusted input must bound the input length and wrap parsing in `try`/`catch` (or offload it to a worker).

## API reference

All functions below are named exports of `@beeff/tuco`; the same functions form the default export. The types `Cursor`, `Fail`, `Success`, `Result`, `Parser`, `Combinator`, `ValueOf`, `ValuesOf`, `ScalarOrTuple`, and `RepValue` are also exported.

### Character parsers

#### `charIs(chr)`

Signature: `charIs(chr: string): Parser<string>`

Matches exactly the single character `chr` and returns it as a string. `chr` must be one UTF-16 code unit, otherwise construction throws.

```ts
charIs("x")("xyz"); // { value: "x", rest: "yz" }
charIs("x")("1yz"); // { failed: true, pos: 0, expected: ['"x"'] }
```

#### `charOneOf(chars)`

Signature: `charOneOf(chars: string): Parser<string>`

Matches one character present in `chars` and returns it.

```ts
charOneOf("xyz")("x123"); // { value: "x", rest: "123" }
charOneOf("xyz")("123"); // { failed: true, pos: 0, expected: ['one of "xyz"'] }
```

#### `charExcept(chars)`

Signature: `charExcept(chars: string): Parser<string>`

Matches one character not present in `chars` and returns it.

```ts
charExcept("xyz")("abc"); // { value: "a", rest: "bc" }
charExcept("xyz")("x123"); // { failed: true, pos: 0, expected: ['char except "xyz"'] }
```

#### `charMeets(predicate, expected?)`

Signature: `charMeets(predicate: (ch: string) => boolean, expected?: string): Parser<string>`

Matches one character satisfying `predicate` and returns it. The optional `expected` names the parser in error results; it defaults to `"char matching predicate"` for a rejected character and `"any character"` when no character is available.

```ts
const digit = charMeets(function (ch) {
  return ch >= "0" && ch <= "9";
}, "digit");

digit("42x"); // { value: "4", rest: "2x" }
digit("x42"); // { failed: true, pos: 0, expected: ["digit"] }
```

#### `anyChar()`

Signature: `anyChar(): Parser<string>`

Matches any single character and returns it.

```ts
anyChar()("123"); // { value: "1", rest: "23" }
anyChar()(""); // { failed: true, pos: 0, expected: ["any character"] }
```

### Literals and sequencing

#### `word(text)`

Signature: `word(text: string): Parser<string>`

Matches the literal non-empty string `text` and returns it. An empty string throws at construction.

```ts
word("text")("text and etc."); // { value: "text", rest: " and etc." }
word("abc")("abx"); // { failed: true, pos: 2, expected: ['"c"'] }
```

#### `all(...combinators)`

Signature: `all<Cs extends Combinator[]>(...combinators: Cs): Parser<ValuesOf<Cs>>`

Matches two or more combinators in order and collects their values into an array. Fewer than two combinators throws at construction.

```ts
all("x", "yy", "x")("xyyx and etc.");
// { value: ["x", "yy", "x"], rest: " and etc." }
```

#### `first(a, b)`

Signature: `first<A extends Combinator, B extends Combinator>(a: A, b: B): Parser<ValueOf<A>>`

Matches `a` then `b`, consumes both, and returns only `a`'s value.

```ts
first(charOneOf("xyz"), charIs("/"))("x/rest");
// { value: "x", rest: "rest" }
```

#### `second(a, b)`

Signature: `second<A extends Combinator, B extends Combinator>(a: A, b: B): Parser<ValueOf<B>>`

Matches `a` then `b`, consumes both, and returns only `b`'s value.

```ts
second(charIs("\\"), charOneOf("xyz"))("\\xxxx");
// { value: "x", rest: "xxx" }
```

#### `between(a, b, c)`

Signature: `between<A extends Combinator, B extends Combinator, C extends Combinator>(a: A, b: B, c: C): Parser<ValueOf<B>>`

Matches `a`, `b`, `c` in order, consumes all three, and returns only the middle value.

```ts
between(charIs("("), charOneOf("xyz"), charIs(")"))("(x)xxx");
// { value: "x", rest: "xxx" }
```

#### `or(...combinators)`

Signature: `or<Cs extends Combinator[]>(...combinators: Cs): Parser<ValuesOf<Cs>[number]>`

Tries the alternatives in order and returns the value of the first that succeeds. If all fail, it reports the furthest failure and unions the expectations found at that position. Fewer than two combinators throws at construction.

```ts
or(word("first"), word("second"))("secondfirst");
// { value: "second", rest: "first" }

or(word("ab"), word("ax"))("az");
// { failed: true, pos: 1, expected: ['"b"', '"x"'] }
```

### Repetition

#### `rep1(...combinators)`

Signature: `rep1<Cs extends Combinator[]>(...combinators: Cs): Parser<RepValue<Cs>>`

Matches its parser one or more times and succeeds only if there is at least one match. A single combinator yields a flat array; two or more yield a list of arrays, one per iteration. No matches produce a failure. A zero-width inner match throws.

```ts
rep1(charIs("x"))("xxxxzzzz");
// { value: ["x", "x", "x", "x"], rest: "zzzz" }

rep1("a", "b")("abab!");
// { value: [["a", "b"], ["a", "b"]], rest: "!" }

rep1(charIs("x"))("");
// { failed: true }
```

#### `rep0(...combinators)`

Signature: `rep0<Cs extends Combinator[]>(...combinators: Cs): Parser<RepValue<Cs>>`

Matches its parser zero or more times. A single combinator yields a flat array; two or more yield a list of arrays. **Zero matches succeed with the empty array `[]`, not `null`.**

```ts
rep0(charIs("x"))("xxxxzzzz");
// { value: ["x", "x", "x", "x"], rest: "zzzz" }

rep0(charIs("x"))("zzz");
// { value: [], rest: "zzz" }

rep0("a", "b")("abab!");
// { value: [["a", "b"], ["a", "b"]], rest: "!" }
```

### Optional and end of input

#### `optional(...combinators)`

Signature: `optional<Cs extends Combinator[]>(...combinators: Cs): Parser<ScalarOrTuple<ValuesOf<Cs>> | null>`

Matches its parser zero or one time. With a single combinator the value is a scalar; with two or more it is an array. When there is no match it returns `null` and leaves the input untouched.

```ts
optional("text")("text and etc."); // { value: "text", rest: " and etc." }
optional("text")("xxx"); // { value: null, rest: "xxx" }

optional("a", "b")("ab!"); // { value: ["a", "b"], rest: "!" }
optional("a", "b")("xx"); // { value: null, rest: "xx" }
```

#### `eof()`

Signature: `eof(): Parser<null>`

Succeeds with `null` only at the end of input; otherwise fails at the current position with `"end of input"` as the expectation.

```ts
eof()(""); // { value: null, rest: "" }
eof()("x"); // { failed: true, pos: 0, expected: ["end of input"] }
```

#### `complete(parser)`

Signature: `complete<T>(parser: Parser<T>): Parser<T>`

Runs `parser` and then requires the end of input. Returns the parser's value; trailing input makes the whole parse fail.

```ts
complete(word("ab"))("ab"); // { value: "ab", rest: "" }
complete(word("ab"))("abx");
// { failed: true, pos: 2, expected: ["end of input"] }
```

### Recursion

#### `defer(thunk)`

Signature: `defer<T>(thunk: () => Parser<T>): Parser<T>`

Defers parser creation until the parser is actually run, which enables direct and mutual recursion. The thunk is called at parse time, and the resulting parser's value and failure are passed through unchanged.

```ts
let exprImpl: Parser<any> = null!;
const expr = defer(() => exprImpl);

exprImpl = or(
  all("(", expr, ")").map(function (values) {
    return values[1];
  }),
  word("x"),
);

expr("((x))"); // { value: "x", rest: "" }
```

## Further examples

The demo grammars in the repository exercise the combinators together:

- [demo.numbers.spec.ts](https://github.com/Pavel-Husakouski/tuco.js/blob/master/pckg.test/test/demo.numbers.spec.ts) — signed, fractional, and exponent numbers built from `all`, `optional`, `rep1`, and `charOneOf`.
- [demo.recursive.spec.ts](https://github.com/Pavel-Husakouski/tuco.js/blob/master/pckg.test/test/demo.recursive.spec.ts) — a recursive grammar using `defer`.
- [demo.query.spec.ts](https://github.com/Pavel-Husakouski/tuco.js/blob/master/pckg.test/test/demo.query.spec.ts) — a query language with precedence, built from `or`, `between`, `first`, `second`, `rep0`, `rep1`, `optional`, and `defer`.
- [demo.calculator.spec.ts](https://github.com/Pavel-Husakouski/tuco.js/blob/master/pckg.test/test/demo.calculator.spec.ts) — an arithmetic expression grammar and its AST.
- [demo.abnf.spec.ts](https://github.com/Pavel-Husakouski/tuco.js/blob/master/pckg.test/test/demo.abnf.spec.ts) — a grammar driven by an ABNF-style description.

## Development

- `npm install`
- `npm test` — build core and run all workspace tests (mocha + tsx)
- `npm run test:core` — core unit tests
- `npm run test:test` — demo grammar tests
- `npm run build` — compile `pckg.core` to `lib/` (JS + `.d.ts` + sourcemaps)

## Priorities

- Quality
- Very minimum set of features
- Easy to read, easy to understand, easy to use
- Short, compact code
