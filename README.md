In memories of Tuco Benedicto Pacifico Juan Maria Ramirez and Eli Herschel Wallach

![alt text](/img/eli_wallach.jpg?raw=true "Tuco Benedicto Pacifico Juan Maria Ramirez and Eli Herschel Wallach")

tuco
====

Minimalist library to use with simple query grammars, built on parser combinators. Written in TypeScript: source lives in `src/`, compiled to `lib/`.

Usage
-----

```ts
import { or, word } from 'tuco';

const parser = or(word('first'), word('second'));
parser('firstsecond');   // { value: 'first', rest: 'second' }
```

Look at `test/demo*.ts` for more details.

Development
-----------

* npm install
* npm test            # mocha + tsx
* npm run typecheck   # tsc --noEmit
* npm run build       # tsc -> lib/ (JS + .d.ts + sourcemaps)

Priorities
----------

* Quality
* Very minimum set of features
* Easy to read, easy to understand, easy to use
* Short, compact code
