# DESIGN.md — code design

## Parser model

A parser is a function `rest -> result`.

- Success: `{ value, rest }` — the parsed value and the remaining input string.
- Failure: `{ failed: true, pos, expected }` — the position where parsing stopped and the list of expected items (`expected` is an array of strings).

Internally parsing works with a cursor `{ str, pos }` (no substring copying), while the remaining input is returned as a string via `__expose`/`__materialize`.

## The shape of `optional` / `rep1` / `rep0`

`__all` with a single combinator returns it unwrapped; with two or more it collects the results into an array. Hence `value` depends on arity:

- `optional(a)` → the scalar from `a`
- `optional(a, b)` → `[valueA, valueB]`
- `rep1(a)` → a flat `[va, va, ...]`
- `rep1(a, b)` → a list of pairs `[[va, vb], ...]`

A deliberate asymmetry: the single case yields a plain scalar rather than extra nesting. Unifying (always an array) would be more regular, but would bring `[[x]]` noise to the single case.

## Semantics and limits

- Ordered choice `or` memoizes per parser instance and input position (packrat-style): within a parse of one input, re-entering the same `or` at the same position returns the cached `Success`/`Fail` instead of recomputing it, so shared-prefix alternatives no longer cost O(2^k). Memoization does not rescue left recursion, so keep grammars left-factored and unambiguous.
- "Character" means a UTF-16 code unit. `charIs` / `charOneOf` / `charExcept` / `charMeets` / `anyChar` / `word` all operate on code units, so a single astral character is two code units — `charIs("😀")` is rejected, while `word("😀")` matches through two units.
- Parsing is synchronous and bounded at the public boundary (`__expose`, where a parser is invoked with a raw string or `null`):
  - **Input length** — input longer than `MAX_INPUT_LENGTH` (100 000 UTF-16 code units) is rejected before any parser runs.
  - **Work budget** — one top-level parse may take at most `MAX_PARSE_STEPS` (1 000 000) parser-entry steps and nest at most `MAX_PARSE_DEPTH` (1 000) parser calls. Exceeding either stops the parse, so deep recursion and exponential backtracking can neither hang nor overflow the stack.
  - **Crashes** — a `RangeError` escaping the parser (for example a stack overflow) is caught at the boundary.

  Each produces the ordinary failure shape `{ failed: true, pos, expected }`, extended with `limit: true` (`Fail.limit`) so a caller can distinguish a budget failure from a normal mismatch: `pos` is the last position reached and `expected` names the exceeded limit.

  `rep1` / `rep0` additionally throw a clear error when their inner parser matches zero width (a grammar bug, not an input problem).

## Test style

Tests follow one pattern: first declare the parser, then run it and save the result, then check it with a single asymmetric matcher — every test that asserts a result uses exactly one `match(...).with(...)` (a test that only prints output for inspection has none). A narrowing guard that only extracts a value (see [Checking errors](#checking-errors)) is not a matcher and does not count against this.

```ts
import { match } from "@beeff/loose-match";
import { anyChar } from "../src";

it("value and rest are not when match", function () {
  const parser = anyChar();
  const result = parser("123");

  match(result).with({ value: "1", rest: "23" });
});
```

An object schema checks only the listed properties, so a test states exactly what it cares about and ignores the rest. Array and primitive schemas match by value, exactly like `deepEqual`; combinators (`instanceOf`, `re`, `predicate`, …) turn a rule into a matcher.

Rules:

1. **Strict equality** — only `===` / `!==`, never `==` / `!=`; the one allowed nullish spelling is the explicit `x === null || x === undefined` (or a tiny `__isNil` helper).
2. **`const` by default.** Parsers, grammars, predicates, helpers and imports are assigned once, so they are declared with `const`:
   ```ts
   const parser = or(word("first"), word("second"));
   const isLetter = function (c) {
     return /[a-zA-Z]/.test(c);
   };
   ```
   A named helper is therefore a `const`-bound function expression, not a `function` declaration; the `function` keyword remains only in callback position (`it(...)`, `describe(...)`, `.map(...)`, `predicate(...)`).
3. **`let` only for reassignable values.** A variable whose value changes later (accumulators in loops, `*Impl` forward declarations) is declared with `let`; `var` is not used:
   ```ts
   let acc = v[0];
   acc = apply(op, acc, right);

   let exprImpl: any = null; // forward declaration of mutual recursion
   // ...
   exprImpl = add; // ordinary assignment to an already-declared variable
   ```
   A forward declaration of two variables on one line is split: the `Impl` holder is `let`, the wrapper is `const`:
   ```ts
   let exprImpl: any = null;
   const expr = function (x) {
     return exprImpl(x);
   };
   ```
   The contents of an array or object may still be mutated (`push`, assignment by index) — the variable itself stays `const`.

### Checking errors

The parse result is a tagged union `Result<T> = Success<T> | Fail`, so the parse-result fields `.value`/`.rest`/`.pos`/`.expected` are never read off an unnarrowed union. A test asserts the result via `match(...).with(...)`; when it needs the value for further checks, it first narrows the type via `'failed' in result`.

A failure is compared as a whole:

```ts
const result = word("abc")("abx");

match(result).with({ failed: true, pos: 2, expected: ['"c"'] });
```

A success is compared as a whole:

```ts
const result = word("text")("text and etc.");

match(result).with({ value: "text", rest: " and etc." });
```

When only the fact of failure is needed:

```ts
match(result).with({ failed: true });
```

When a value must be extracted from a successful result for further checks, narrow via `if`. This guard asserts failure, but it is not a `match(...)` and therefore does not violate the one-match rule:

```ts
const result = rulelist("x = ...");
if ("failed" in result) throw new Error("expected success");
// result is narrowed to Success<any> here; `result.value` and `result.rest` are safe
```

The same narrowing may live in a small helper when several tests extract values.

## Line endings

Tests contain files with CRLF and LF, with spaces and tabs. When editing a file, its line endings and indentation are preserved as-is.
