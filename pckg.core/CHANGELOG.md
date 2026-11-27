# CHANGELOG

# version 1.0.0-rc3

- [x] 53 [bug] `rep1`/`rep0`: iterative rewrite + progress guard — fixes the O(n²) `concat` rebuild, the ~5k-item stack overflow, and zero-width parsers looping forever
- [x] 52 [breaking] `Combinator`/`Parser` contract lies: combinators receive an internal `Cursor`, not the declared `string|null` — restrict `Combinator` to `string | Parser<A>` and add `defer` (option C); hand-written raw functions no longer accepted
- [x] 51 [bug] `optional(...)(null)`/`rep0(...)(null)` throw `TypeError`; normalize `null` to an empty cursor in `__toCursor`
- [x] 50 [bug] `charMeets` reports `"any character"` at EOF instead of its own `expected`
- [x] 49 [types] `ValueOf` falls back to `any` for function combinators; infer structurally with a `never` fallback and drop the dead `Combinator<A>` param
- [x] 48 [feature] add `defer`/`lazy` (typed mutual recursion, no `let xImpl: any`) and `eof`/`complete` (replace the `parseQuery` leftover-input workaround)
- [x] 47 [breaking] `rep0` returns `[]` for zero matches instead of `null`; reserve `null` for `optional`
- [x] 46 [build] packaging: add `exports` map, `prepack`/`prepublishOnly`, `inlineSources`; fix `test:test` to build core first
- [x] 45 [tests] cover custom combinators in composition, `null` input for every family, EOF `expected`, argument-validation guards; de-flake order-dependent `rules` in `demo.abnf`
- [x] 44 [design] `or` backtracking is exponential (2^k on shared prefixes) without memoization; document/guard
- [x] 43 [design] `__expose` mutates an enumerable `.map` + `as unknown as Parser<T>`; build the record properly
- [x] 42 [design] remove implicit string→word coercion and dead `__builtin` branches; `first`/`second`/`between` via typed projections instead of `indexToTake`
- [x] 41 [docs] align CHANGELOG marker with `package.json` (still RC); fix stale refs (`npm run typecheck`, `README.md`→`readme.md`, old file names, "107 passing"→99)
- [x] 40 [var] strict equality `===`/`!==` per DESIGN.md:43 (`ch == chr`, length/index null-checks); keep `x == null` as an explicit null-or-undefined check
- [x] 39 [bug] `.map` runs on `optional`/`rep0`'s `null`; `demo.numbers` crashes on plain `"42"` — null-safe projection or skip projection on null
- [x] 38 [docs] document UTF-16 code-unit semantics and the trust model (synchronous, no input/depth/time bounds)
- [x] 37 [breaking] Remove `foldLeft`/`foldRight` from the API (and internal `__chain`/`__defaultApply`/`__foldl`/`__foldr`); the calculator demo folds `[op, a, b]` chains via `all`/`rep0` + a local fold; drop the core `foldLeft`/`foldRight` tests; update the default export and rebuild `lib/`
- [x] 36 [build] Add publish files to `package.json` `files`: `lib`, `readme.md`, `CHANGELOG.md`, `LICENSE`
- [x] 35 [docs] Rename `TODO.md` to `CHANGELOG.md` and update the references in `CLAUDE.md` (section header + text) and the self-references in the changelog
- [x] 34 [tests] Replace `node:assert` (`deepEqual`/`strictEqual`/`assert`/`throws`) with `@beeff/loose-match` matchers in every test: one `match(...).with(...)` per test; add `@beeff/loose-match` to devDeps; rewrite the `DESIGN.md` test-style section
- [x] 33 [docs] Translate `.md` files to English (`DESIGN.md`, `CHANGELOG.md`, `CLAUDE.md`; `readme.md` was already English) and document the language rule + `CHANGELOG.md` workflow in `CLAUDE.md`
- [x] 32 [docs] Translate the remaining Russian comments to English: `test/demo.abnf.spec.ts` (header, inline, `;`-comments inside `source`), `test/demo.calculator.spec.ts` (header + inline), `test/demo.query.spec.ts` (op0/op1 precedence block); `src/` is already English; `DESIGN.md`/`CHANGELOG.md`/`CLAUDE.md` — docs/backlog/instructions, untouched
- [x] 31 [breaking] Replace `chain`/`foldl`/`foldr` with `foldLeft`/`foldRight` (chain+fold in one step, no `[head, pairs]` leak); `chain`/`foldl`/`foldr` become internal `__*`; update demos/tests and the default export; two overloads (default tree → `Parser<any>`, custom `apply` → `Parser<A>`)
- [x] 30 [types] Type `foldl`/`foldr` (option 1): input `(value: [V, [P, V][]]) => any`; `apply` with `op: P`, `left`/`right` by meaning (operand `V` / accumulator `any`); the result stays `any`; defaults `V = any`, `P = any`
- [x] 29 [types] Remove `Parser<any>` via variadic-tuple inference (no overloads): `Combinator<A>` + helpers `ValueOf`/`ValuesOf`/`ScalarOrTuple`/`RepValue`; one generic signature per combinator (`all`/`first`/`second`/`between`/`rep1`/`rep0`/`optional`/`or`/`chain`); leave the bodies unchanged (`__expose<any>` is already compatible — signatures only); leave `char*`/`word` — already `Parser<string>`
- [x] 28 [docs] Compact JSDoc comments for the 17 public functions of `src/tuco.ts` (in English); translate the Russian `__all` comment (arity asymmetry) to English
- [x] 27 [verify] `npm run build:test -w pckg.core` (clean), `npm test` (99 passing), `npm run build` → `lib/`, sanity-import `lib/tuco.js`
- [x] 26 [docs] `readme.md`: remove `gulp`, describe `npm install`/`npm test`/`npm run build`/`npm run build:test -w pckg.core`
- [x] 25 [var] `var` → `const`/`let` in `src/` and `test/`; update `DESIGN.md` (style `var` → `const`/`let`, assert example → `deepEqual`)
- [x] 24 [tests] `test/*.js` → `test/*.ts`: import `../src/tuco.ts`; assert via `deepEqual`/`'failed' in r`; forward decls `: any`; `.mocharc.cjs` → `test/*.ts`
- [x] 23 [lib] `tuco.js` → `src/tuco.ts`: types `Cursor`/`Fail`/`Success`/`Result`/`Parser`, rest parameters instead of `arguments`, type-only export of types, public API unchanged (default object + 17 named)
- [x] 22 [setup] Toolchain: devDeps `typescript@7` + `tsx` + `@types/node` + `@types/mocha`; `tsconfig.json` + `tsconfig.build.json`; `package.json` (`main`/`types`/`files`/scripts); `.gitignore` + `lib`

- [x] 21 [bug] Unary minus binds tighter than `^` (should be looser)
  - Where: `test/demo.calculator-2.test.js` — `atom = ... | '-' atom`.
  - Effect: `-2^2` parsed as `(-2)^2`, but the convention is `-(2^2)`.
  - Fix: remove `'-' atom` from `atom`, insert a `unary = '-' unary | power` level between `mul` and `power`.

- [x] 20 [feature] `chain` / `foldl` / `foldr` — folding operator chains
  - Where: `tuco.js` (exports `chain`, `foldl`, `foldr`), tests `test/tuco.test.js`.
  - `chain(operand, operator)` = `all(operand, rep0(all(operator, operand)))`, returns `[head, pairs]`.
  - `foldl(apply?)` / `foldr(apply?)` fold the pairs left/right; the default `apply` is `(op, a, b) => [op, a, b]`.
  - Gives left (`2-3-4`) and right (`2^3^2`) associativity without left recursion.

- [x] 19 [test] Regression tests for the bugs found
  - The suite is green now (74 passing), but bugs 1–6 are not covered by tests.
  - Add: `word('')` (expect at construction), `rep1()/rep0()/optional()` with no arguments, `2-3-4` for associativity, `buildClauses(null)`, `deepEqual` instead of `assert(r, {...})`.

- [x] 18 [test] `demo.calculator.test.js` doesn't test
  - `assert` is imported but unused — only `console.log` of the AST. Not a single assertion (mocha sees an empty file).
  - Fix: add asserts (and catch item 4 along the way).

- [x] 17 [improvement] Metadata inconsistency
  - npm name `tuco` vs bower name `tuco.js` (`package.json:2`, `bower.json:2`);
  - license URL → `hollander/tuco.js` (`package.json:23`), bower homepage → `Hollander/tuco.js` (`bower.json:4`), repository → `Pavel-Husakouski/tuco.js` (`package.json:7`).
  - Fix: unify on one account and one name.

- [x] 16 [improvement] The gulp task is named `build`, but runs tests
  - Where: `gulpfile.js:4`.
  - Fix: rename to `test`/`default`; add `"scripts": {"test": "gulp build"}` to package.json.

- [x] 15 [design] `demo.abnf.js` — ABNF instead of EBNF
  - Renamed `test/demo.ebnf.js` → `test/demo.abnf.js`; the spec was rewritten in ABNF (RFC 5234).
  - The meta-demo (parsing this ABNF with tuco itself) is not part of the item — it stays a future idea.

- [x] 14 [design] The two-operator `Op0`/`Op1` trick in the query grammar
  - Where: `test/demo.query.test.js`.
  - `AND` before a parenthesis without a space binds as shaped, before a word otherwise. A subtle precedence mechanism that doesn't read from the code — needs an explanatory comment.

- [x] 13 [design] `nsImport` via `eval`
  - Removed: the library moved to ESM (`"type": "module"`), tests use named imports.

- [x] 12 [design] The `optional(a)` vs `optional(a, b)` asymmetry
  - Documented in `DESIGN.md` and by a comment in `__all`.

- [x] 11 [design] `rep1` builds its array via concat + slice
  - Replaced with direct code: `[v].concat(x == null ? [] : x)`.

- [x] 10 [design] `parseWithRestore` is fragile
  - Where: `test/demo.query.test.js`.
  - If `parser(text)` returns `null` — it crashes on `result.rest`. It only survives now because `query` never returns `null` (all parts are under `optional`) — that's non-obvious and worth a comment.

- [x] 9 [design] `null` as an error loses position and expectations
  - You can't tell _where_ parsing stopped and _what_ was expected. That's why the query demo grew the `parseWithRestore` hack (rewrites the input, replacing the "bad" character with a space).
  - Option: return `{expected, pos}` or a failure object instead of `null` — removes the need for the workaround.

- [x] 8 [design] O(n²) on slices
  - Where: `tuco.js:96-97` — `__anyChar` does `rest.slice(1)` per character, copying the rest of the string each time.
  - Unnoticeable for query strings, painful for long texts.
  - Option: an internal cursor `{str, pos}` while keeping the external API.

- [x] 7 [design] `Function.prototype.map` — a global prototype patch
  - Where: `tuco.js:35`.
  - Any function in the app gains `.map`, and an enumerable one at that. The idea "parser = function → mappable" is good, but the implementation is risky.
  - Option: a plain `map(parser, f)` function + keep `.map` as sugar; or make the property non-enumerable.

- [x] 6 [bug] `assert(r, {...})` instead of `assert.deepEqual`
  - Where: `test/tuco.test.js:420` (the "all not null when match" test).
  - Effect: the second `assert` argument is a _message_, not an expectation: values are never checked, the test passes "by luck".
  - Fix: `assert.deepEqual(r, { value:['x','y','z','1'], rest:'rest' });`.

- [x] 5 [bug] `!result == null` — a dead guard due to operator precedence
  - Where: `test/demo.query.test.js:110` in `buildClauses`.
  - Effect: `(!result) == null` is always `false`, the early exit never fires; on `null` it crashes on `result.kind`.
  - Fix: `if(result == null) return [];`.

- [x] 4 [bug] Calculator: right associativity for `-` and `/`
  - Where: `test/demo.calculator.test.js` — `expr_tail > ["+" factor expr_tail | "-" factor expr_tail]` (a right-recursive tail).
  - Effect: `2-3-4` parses as `2-(3-4)`, not `(2-3)-4`. Irrelevant for `+`/`*`, wrong semantics for `-`/`/`. Not caught because the demo only prints the AST and doesn't evaluate.
  - Verified: `expr('2-3-4')` → `[2, ["-", 3, ["-", 4]]]`.
  - Fix: left associativity (accumulator/fold in the tail) + evaluation in the demo so the test catches it.

- [x] 3 [bug] `rep1()` / `rep0()` / `optional()` with no arguments
  - Where: `tuco.js:201-206`, `tuco.js:224-230`, `tuco.js:232-244` — there's no length check (unlike `all()` and `or()`, which have one); `__areCombinators([])` returns `true`, because `[].every(...)` on an empty array is truthy.
  - Effect: the same TypeError via `__all([])`.
  - Verified: `tuco.rep1()('a')`, `tuco.optional()('a')` → TypeError.
  - Fix: add `args.length >= 1` to `__expect`.

- [x] 2 [bug] `word('')` builds a broken parser
  - Where: `tuco.js:190-199` — `__expect` only checks `__isString`, though the message promises "non-empty string".
  - Effect: `''.split('')` → `[]`, `__all([])` returns a parser that throws `TypeError: Cannot read properties of undefined (reading 'rest')` when called (`tuco.js:168`). It fails at parse time, not at construction.
  - Verified: `tuco.word('')('a')` → TypeError.
  - Fix: `__expect(__isString(text) && text.length > 0, ...)`.

- [x] 1 [bug] `package.json` — invalid JSON
  - Where: `package.json:11` — a trailing comma after `"name": "Pavel Husakouski",`
  - Effect: `npm install` fails to parse; even `mocha` can't start from the repo (`ERR_MOCHA_UNPARSABLE_FILE`), needing the `--no-package` flag.
  - Fix: remove the comma. Also: `"licenses"` → `"license": "MIT"` (SPDX), `"tags"` → `"keywords"`, add `"scripts": {"test": "gulp build"}`.
