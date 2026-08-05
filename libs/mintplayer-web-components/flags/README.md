# `@mintplayer/web-components/flags`

Lazily-loaded 3x2 SVG country flags, in two shapes: the whole corpus as one
chunk, or one chunk per flag. **Pick by how many flags you show, not by taste** —
the difference is measured and large.

```ts
import { loadAllFlags, loadFlag } from '@mintplayer/web-components/flags';

// Many flags at once (a country picker): ONE request, ~43 KB gzip.
const flags = await loadAllFlags();
flags['be']; // string | undefined

// A handful of specific flags: one ~350 B gzip chunk each.
const svg = await loadFlag('be'); // string | undefined
```

Both are cached and neither ever rejects: an unknown code, and a chunk that
failed to load, read as `undefined`.

Use `loadAllFlags()` for anything showing more than a few flags. Fetching all 244
through `loadFlag()` measured **3.2 s** to complete over HTTP/1.1 at 50 ms RTT
(1.9 s at 20 ms, 0.44 s over HTTP/2) against **0.2 s** for the single chunk, and
90 KB gzip plus ~50 KB of response headers against 43 KB — the corpus compresses
to 43 KB together and 90 KB apart. The two do not share a cache, so calling both
for the same flag fetches it twice; that is the price of letting a bundler drop
whichever one you do not use (verified: a consumer that only calls
`loadAllFlags()` emits none of the 244 per-flag chunks).

`src/assets/*.svg` are **vendored sources**, not build artifacts: they are
committed, and refreshed by `node tools/scripts/refresh-flags.mjs` from the
`country-flag-icons` devDependency. `src/flag-loaders.generated.ts` and
`src/all-flags.generated.ts` are gitignored artifacts produced by the
`codegen-wc` Nx target.

## License of the vendored artwork

The SVGs are taken verbatim from [country-flag-icons](https://www.npmjs.com/package/country-flag-icons) v1.6.20, which is MIT-licensed:

```
(The MIT License)

Copyright (c) 2020 @catamphetamine <purecatamphetamine@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
