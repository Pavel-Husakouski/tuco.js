# TODO — баги и доработки

Результат ревью от 25.11.2026. Все пункты проверены на живом коде (node v26.12.0, тест-сьют: 74 passing).

---

- [x] 32 [docs] Перевести оставшиеся русские комментарии на английский: `test/demo.abnf.ts` (шапка, inline, `;`-комментарии внутри `source`), `test/demo.calculator.test.ts` (шапка + inline), `test/demo.query.test.ts` (блок приоритета op0/op1); `src/` уже английский; `DESIGN.md`/`TODO.md`/`CLAUDE.md` — документация/бэклог/инструкции, не трогать
- [x] 31 [breaking] Заменить `chain`/`foldl`/`foldr` на `foldLeft`/`foldRight` (chain+fold в один шаг, без `[head, pairs]` наружу); `chain`/`foldl`/`foldr` — во внутренние `__*`; обновить демо/тесты и default-экспорт; два оверлоада (дефолт-дерево → `Parser<any>`, кастомный `apply` → `Parser<A>`)
- [x] 30 [types] Типизировать `foldl`/`foldr` (вариант 1): вход `(value: [V, [P, V][]]) => any`; `apply` с `op: P`, `left`/`right` по смыслу (операнд `V` / аккумулятор `any`); результат остаётся `any`; дефолты `V = any`, `P = any`
- [x] 29 [types] Убрать `Parser<any>` через variadic-tuple inference (без оверлоадов): `Combinator<A>` + хелперы `ValueOf`/`ValuesOf`/`ScalarOrTuple`/`RepValue`; по одной generic-сигнатуре на комбинатор (`all`/`first`/`second`/`between`/`rep1`/`rep0`/`optional`/`or`/`chain`); тела не менять (`__expose<any>` уже совместим — сигнатуры-only); `char*`/`word` не трогать — уже `Parser<string>`
- [x] 28 [docs] Компактные JSDoc-комментарии 17 публичных функций `src/tuco.ts` (на английском); перевести русский комментарий `__all` (асимметрия арности) на английский
- [x] 27 [verify] `npm run typecheck` (чисто), `npm test` (107 passing), `npm run build` → `lib/`, sanity-import `lib/tuco.js`
- [x] 26 [docs] `README.md`: убрать `gulp`, описать `npm install`/`npm test`/`npm run build`/`npm run typecheck`
- [x] 25 [var] `var` → `const`/`let` в `src/` и `test/`; обновить `DESIGN.md` (стиль `var` → `const`/`let`, пример assert → `deepEqual`)
- [x] 24 [tests] `test/*.js` → `test/*.ts`: импорт `../src/tuco.ts`; assert через `deepEqual`/`'failed' in r`; forward-decls `: any`; `.mocharc.cjs` → `test/*.ts`
- [x] 23 [lib] `tuco.js` → `src/tuco.ts`: типы `Cursor`/`Fail`/`Success`/`Result`/`Parser`, rest-параметры вместо `arguments`, type-only экспорт типов, публичный API без изменений (default-объект + 17 named)
- [x] 22 [setup] Toolchain: devDeps `typescript@7` + `tsx` + `@types/node` + `@types/mocha`; `tsconfig.json` + `tsconfig.build.json`; `package.json` (`main`/`types`/`files`/scripts); `.gitignore` + `lib`

- [x] 21 [bug] Унарный минус связывается сильнее `^` (нужно слабее)
  - Где: `test/demo.calculator-2.test.js` — `atom = ... | '-' atom`.
  - Следствие: `-2^2` парсился как `(-2)^2`, а конвенция — `-(2^2)`.
  - Фикс: убрать `'-' atom` из `atom`, вставить уровень `unary = '-' unary | power` между `mul` и `power`.

- [x] 20 [feature] `chain` / `foldl` / `foldr` — свёртка цепочек операторов
  - Где: `tuco.js` (экспорт `chain`, `foldl`, `foldr`), тесты `test/tuco.test.js`.
  - `chain(operand, operator)` = `all(operand, rep0(all(operator, operand)))`, возвращает `[head, pairs]`.
  - `foldl(apply?)` / `foldr(apply?)` сворачивают пары влево/вправо; дефолтный `apply` — `(op, a, b) => [op, a, b]`.
  - Даёт левую (`2-3-4`) и правую (`2^3^2`) ассоциативность без левой рекурсии.

- [x] 19 [test] Регрессионные тесты на найденные баги
  - Сейчас сьют зелёный (74 passing), но баги 1–6 тестами не покрыты.
  - Добавить: `word('')` (expect при построении), `rep1()/rep0()/optional()` без аргументов, `2-3-4` для ассоциативности, `buildClauses(null)`, `deepEqual` вместо `assert(r, {...})`.

- [x] 18 [test] `demo.calculator.test.js` не тестирует
  - `assert` импортирован, но не используется — только `console.log` AST. Нет ни одного утверждения (mocha видит пустой файл).
  - Фикс: добавить asserts (и заодно поймать пункт 4).

- [x] 17 [improvement] Рассогласование метаданных
  - npm-имя `tuco` vs bower-имя `tuco.js` (`package.json:2`, `bower.json:2`);
  - URL лицензии → `hollander/tuco.js` (`package.json:23`), bower homepage → `Hollander/tuco.js` (`bower.json:4`), repository → `Pavel-Husakouski/tuco.js` (`package.json:7`).
  - Фикс: унифицировать на один аккаунт и одно имя.

- [x] 16 [improvement] gulp-таск называется `build`, а запускает тесты
  - Где: `gulpfile.js:4`.
  - Фикс: переименовать в `test`/`default`; добавить `"scripts": {"test": "gulp build"}` в package.json.

- [x] 15 [design] `demo.abnf.js` — ABNF вместо EBNF
  - Переименован `test/demo.ebnf.js` → `test/demo.abnf.js`; спецификация переписана в ABNF (RFC 5234).
  - Мета-демо (распарсить этот ABNF самим tuco) — не входит в пункт, остаётся идеей на будущее.

- [x] 14 [design] Трюк с двумя операторами `Op0`/`Op1` в query-грамматике
  - Где: `test/demo.query.test.js`.
  - `AND` перед скобкой без пробела связывается как shaped, перед словом — иначе. Хитрый механизм приоритета, из кода не читается — нужен комментарий с объяснением.

- [x] 13 [design] `nsImport` через `eval`
  - Удалён: библиотека переведена на ESM (`"type": "module"`), тесты используют именованные импорты.

- [x] 12 [design] Асимметрия `optional(a)` vs `optional(a, b)`
  - Задокументировано в `DESIGN.md` и комментарием в `__all`.

- [x] 11 [design] `rep1` строит массив через concat + slice
  - Заменено на прямой код: `[v].concat(x == null ? [] : x)`.

- [x] 10 [design] `parseWithRestore` хрупок
  - Где: `test/demo.query.test.js`.
  - Если `parser(text)` вернёт `null` — упадёт на `result.rest`. Сейчас спасает только то, что `query` никогда не возвращает `null` (все части под `optional`) — это неочевидно, стоит закомментировать.

- [x] 9 [design] `null` как ошибка теряет позицию и ожидания
  - Нельзя сказать, *где* парсинг упал и *что* ожидалось. Из-за этого в query-демо появился хак `parseWithRestore` (переписывает вход, заменяя «плохой» символ на пробел).
  - Вариант: возвращать `{expected, pos}` или failure-объект вместо `null` — уберёт необходимость в костыле.

- [x] 8 [design] O(n²) на слайсах
  - Где: `tuco.js:96-97` — `__anyChar` делает `rest.slice(1)` на каждый символ, каждый раз копируя остаток строки.
  - Для query-строк незаметно, для длинных текстов — больно.
  - Вариант: внутренний курсор `{str, pos}` при сохранении внешнего API.

- [x] 7 [design] `Function.prototype.map` — глобальный патч прототипа
  - Где: `tuco.js:35`.
  - Любая функция в приложении получает `.map`, свойство к тому же enumerable. Идея «парсер = функция → можно мапить» — хорошая, но реализация рискованная.
  - Вариант: обычная функция `map(parser, f)` + сохранить `.map` как сахар; или сделать свойство non-enumerable.

- [x] 6 [bug] `assert(r, {...})` вместо `assert.deepEqual`
  - Где: `test/tuco.test.js:420` (тест «all not null when match»).
  - Следствие: второй аргумент `assert` — это *сообщение*, а не ожидание: значения не проверяются вообще, тест проходит «по удаче».
  - Фикс: `assert.deepEqual(r, { value:['x','y','z','1'], rest:'rest' });`.

- [x] 5 [bug] `!result == null` — мёртвый+ guard из-за приоритета операторов
  - Где: `test/demo.query.test.js:110` в `buildClauses`.
  - Следствие: `(!result) == null` — всегда `false`, ранний выход никогда не срабатывает; при `null` упадёт на `result.kind`.
  - Фикс: `if(result == null) return [];`.

- [x] 4 [bug] Калькулятор: правая ассоциативность у `-` и `/`
  - Где: `test/demo.calculator.test.js` — `expr_tail > ["+" factor expr_tail | "-" factor expr_tail]` (праворекурсивный хвост).
  - Следствие: `2-3-4` парсится как `2-(3-4)`, а не `(2-3)-4`. Для `+`/`*` неважно, для `-`/`/` — неверная семантика. Не ловится, потому что демо только печатает AST и не вычисляет.
  - Проверено: `expr('2-3-4')` → `[2, ["-", 3, ["-", 4]]]`.
  - Фикс: левая ассоциативность (аккумулятор/fold в хвосте) + вычисление в демо, чтобы тест ловил.

- [x] 3 [bug] `rep1()` / `rep0()` / `optional()` без аргументов
  - Где: `tuco.js:201-206`, `tuco.js:224-230`, `tuco.js:232-244` — проверки длины нет (в отличие от `all()` и `or()`, где она есть); `__areCombinators([])` возвращает `true`, потому что `[].every(...)` на пустом массиве — истина.
  - Следствие: тот же TypeError через `__all([])`.
  - Проверено: `tuco.rep1()('a')`, `tuco.optional()('a')` → TypeError.
  - Фикс: добавить `args.length >= 1` в `__expect`.

- [x] 2 [bug] `word('')` создаёт сломанный парсер
  - Где: `tuco.js:190-199` — `__expect` проверяет только `__isString`, хотя сообщение обещает «non-empty string».
  - Следствие: `''.split('')` → `[]`, `__all([])` возвращает парсер, который при вызове кидает `TypeError: Cannot read properties of undefined (reading 'rest')` (`tuco.js:168`). Падает не при построении, а в момент парсинга.
  - Проверено: `tuco.word('')('a')` → TypeError.
  - Фикс: `__expect(__isString(text) && text.length > 0, ...)`.

- [x] 1 [bug] `package.json` — невалидный JSON
  - Где: `package.json:11` — висящая запятая после `"name": "Pavel Husakouski",`
  - Следствие: `npm install` падает при парсинге; даже `mocha` не может стартовать из репозитория (`ERR_MOCHA_UNPARSABLE_FILE`), нужен флаг `--no-package`.
  - Фикс: убрать запятую. Заодно: `"licenses"` → `"license": "MIT"` (SPDX), `"tags"` → `"keywords"`, добавить `"scripts": {"test": "gulp build"}`.
