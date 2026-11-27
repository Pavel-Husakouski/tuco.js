In memories of Tuco Benedicto Pacifico Juan Maria Ramirez and Eli Herschel Wallach

![alt text](/img/eli_wallach.jpg?raw=true "Tuco Benedicto Pacifico Juan Maria Ramirez and Eli Herschel Wallach")

tuco
====

Minimalist library to use with simple query grammars, built on parser combinators. Written in TypeScript: source lives in `src/`, compiled to `lib/`.

Usage
-----

```ts
import { or, word } from "@beeff/tuco";

const parser = or(word("first"), word("second"));
parser("firstsecond"); // { value: 'first', rest: 'second' }
```

Look at `pckg.test/test/demo*.spec.ts` for more details.

Development
-----------

- npm install
- npm test # build core + run all workspace tests (mocha + tsx)
- npm run test:core # core unit tests
- npm run test:test # demo grammar tests
- npm run build # compile pckg.core -> lib/ (JS + .d.ts + sourcemaps)

Priorities
----------

- Quality
- Very minimum set of features
- Easy to read, easy to understand, easy to use
- Short, compact code
