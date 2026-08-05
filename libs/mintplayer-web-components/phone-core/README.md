# `@mintplayer/web-components/phone-core`

Country/dial-code data and per-country phone-number rules for `mp-phone-input`.

```ts
import { phoneCountries, loadPhoneRules } from '@mintplayer/web-components/phone-core';

phoneCountries; // eager, ~1.8 KB gzip — the picker list and dial codes
const rules = await loadPhoneRules('be'); // lazy, ~0.3 KB gzip for this calling code
rules?.format('470123456'); // '470 12 34 56'
rules?.toE164('0470123456'); // '+32470123456'
rules?.isValid('47012345'); // false — one digit short
rules?.type('470123456'); // 'MOBILE'
```

`src/metadata/cc-*.generated.ts` and `src/metadata-loaders.generated.ts` are
gitignored build artifacts produced by the `codegen-wc` Nx target
(`tools/scripts/build-phone-metadata.mjs`), which slices `libphonenumber-js`'s own
`metadata.max.json` into one module per **calling code**. A consumer therefore
downloads full-precision validation and formatting rules for the block the
selected country belongs to instead of all 244 countries' rules at once — the
country is always known before any rule is needed, because resolving a `+XX`
prefix is `phoneCountries`' job, not libphonenumber's.

The calling code, not the country, is the slice unit because a number typed under
one member of a shared block is often a sibling's number (a Toronto number on a
form set to the United States), and libphonenumber validates it against every
member. Formats for a shared block are also stored only in its "main" country.

## License of the redistributed metadata

The metadata chunks are a mechanical subset of
[`libphonenumber-js`](https://www.npmjs.com/package/libphonenumber-js)'s
`metadata.max.json`, which is generated from Google's
[`PhoneNumberMetadata.xml`](https://github.com/google/libphonenumber/blob/master/resources/PhoneNumberMetadata.xml)
and distributed under the Apache License 2.0:

```
Copyright (C) 2011 The Libphonenumber Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

The `libphonenumber-js` code that reads the metadata stays an ordinary dependency
(MIT) and is not redistributed here. The country/dial-code table comes from
[`intl-tel-input`](https://www.npmjs.com/package/intl-tel-input) (MIT), also an
ordinary dependency.
