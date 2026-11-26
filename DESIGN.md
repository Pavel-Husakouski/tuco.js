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

## Test style

Tests follow one pattern: first declare the parser, then run it and save the result, then check it with a single asymmetric matcher — exactly one `match(...).with(...)` per test.

```ts
import { match } from '@beeff/loose-match';
import { anyChar } from '../src/tuco.ts';

it('value and rest are not when match', function(){
    const parser = anyChar();
    const result = parser('123');

    match(result).with({ value: '1', rest: '23' });
});
```

An object schema checks only the listed properties, so a test states exactly what it cares about and ignores the rest. Array and primitive schemas match by value, exactly like `deepEqual`; combinators (`instanceOf`, `re`, `predicate`, …) turn a rule into a matcher.

Rules:

1. **Strict equality** — only `===` / `!==`, never `==` / `!=`.
2. **`const` by default.** Parsers, grammars, predicates, helpers and imports are assigned once, so they are declared with `const`:
   ```ts
   const parser = or(word('first'), word('second'));
   const isLetter = function(c){ return /[a-zA-Z]/.test(c); };
   ```
3. **`let` only for reassignable values.** A variable whose value changes later (accumulators in loops, `*Impl` forward declarations) is declared with `let`; `var` is not used:
   ```ts
   let acc = v[0];
   acc = apply(op, acc, right);

   let exprImpl: any = null;   // forward declaration of mutual recursion
   // ...
   exprImpl = add;             // ordinary assignment to an already-declared variable
   ```
   A forward declaration of two variables on one line is split: the `Impl` holder is `let`, the wrapper is `const`:
   ```ts
   let exprImpl: any = null;
   const expr = function(x){ return exprImpl(x); };
   ```
   The contents of an array or object may still be mutated (`push`, assignment by index) — the variable itself stays `const`.

### Checking errors

The parse result is a tagged union `Result<T> = Success<T> | Fail`, so `.value`/`.rest`/`.pos`/`.expected` are never accessed directly: a test compares the result via `match(...).with(...)`, or narrows the type via `'failed' in result`.

A failure is compared as a whole:

```ts
const result = word('abc')('abx');

match(result).with({ failed: true, pos: 2, expected: ['"c"'] });
```

A success is compared as a whole:

```ts
const result = word('text')('text and etc.');

match(result).with({ value: 'text', rest: ' and etc.' });
```

When only the fact of failure is needed:

```ts
match(result).with({ failed: true });
```

When a value must be extracted from a successful result for further checks — narrow via `if`:

```ts
const result = rulelist('x = ...');
if ('failed' in result) throw new Error('expected success');
// result is narrowed to Success<any> here
```

## Line endings

Tests contain files with CRLF and LF, with spaces and tabs. When editing a file, its line endings and indentation are preserved as-is.
