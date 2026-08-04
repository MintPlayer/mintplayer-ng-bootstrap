# `@mintplayer/web-components/flags`

Lazily-loaded 3x2 SVG country flags, one chunk per flag.

```ts
import { loadFlag } from '@mintplayer/web-components/flags';

const svg = await loadFlag('be'); // string | undefined
```

`src/assets/*.svg` are **vendored sources**, not build artifacts: they are
committed, and refreshed by `node tools/scripts/refresh-flags.mjs` from the
`country-flag-icons` devDependency. `src/flag-loaders.generated.ts` is a
gitignored artifact produced by the `codegen-wc` Nx target.

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
