# DESIGN.md — дизайн кода

## Модель парсера

Парсер — это функция `rest -> результат`.

- Успех: `{ value, rest }` — распарсенное значение и остаток входной строки.
- Ошибка: `{ failed: true, pos, expected }` — позиция, где парсинг остановился, и список ожидаемых элементов (`expected` — массив строк).

Внутри парсинг работает с курсором `{ str, pos }` (без копирования подстрок), а наружу остаток отдаётся как строка через `__expose`/`__materialize`.

## Стиль тестов

Тесты следуют одному образцу: сначала объявляем парсер, затем запускаем его и сохраняем результат, затем проверяем.

```js
it('value and rest are not when match', function(){
    const parser = anyChar();
    var result = parser('123');

    assert(result.value === '1' && result.rest === '23' );
});
```

Правила:

1. **Строгое равенство** — только `===` / `!==`, никогда `==` / `!=`.
2. **`const` для определений** — парсеры, грамматика, предикаты, хелперы и `require` присваиваются один раз, поэтому `const`:
   ```js
   const parser = or(word('first'), word('second'));
   const assert = require('assert');
   const isLetter = function(c){ return /[a-zA-Z]/.test(c); };
   ```
3. **`var result` для результата парсинга** — результат запуска парсера объявляется как `var result` (а не `const`, и не `r`):
   ```js
   var result = parser('firstsecondthird');
   ```
4. **Исключение — forward-объявления взаимной рекурсии.** Переменные вида `*Impl`, которые объявляются как `null` и позже переприсваиваются (взаимная рекурсия грамматик), остаются `var`:
   ```js
   var exprImpl = null, expr = function(x){ return exprImpl(x); };
   // ...
   exprImpl = add;
   ```
   Реальное присваивание при этом пишется без `var` (обычное присваивание к объявленной переменной):
   ```js
   var shapedLogicImpl = null;   // forward-объявление
   // ...
   shapedLogicImpl = all(shaped, opt(logicRest)).map(toLeftArg);   // присваивание
   ```
   Локальные переменные хелперов (например, `var op = v[0];`) тоже остаются `var`.

### Проверка ошибок

Ошибка парсинга — это объект, а не `null`, поэтому тесты проверяют его поля:

```js
const parser = word('abc');
var result = parser('abx');

assert(result.failed);
assert.strictEqual(result.pos, 2);
assert.deepEqual(result.expected, ['"c"']);
```

## Переносы строк

В тестах встречаются файлы с CRLF и LF, с пробелами и табами. При правке файла его переводы строк и отступы сохраняются как есть.
