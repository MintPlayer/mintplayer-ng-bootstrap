import { loadFlag } from '@mintplayer/web-components/flags';
import { loadPhoneRules, phoneCountries } from '@mintplayer/web-components/phone-core';

export async function run() {
  const be = await loadFlag('be');
  const sa = await loadFlag('SA');
  const zz = await loadFlag('zz');

  // Every country the S9 spread covers, plus the two that exercise format
  // inheritance (CA/KZ/VA) — a broken slice shows up as an unformatted number.
  const spread = ['be', 'nl', 'de', 'fr', 'gb', 'us', 'ca', 'it', 'ru', 'cn', 'in', 'br', 'au', 'jp', 'sa', 'kz', 'va'];
  const loaded = await Promise.all(spread.map((iso) => loadPhoneRules(iso)));

  const beRules = await loadPhoneRules('be');
  const ca = await loadPhoneRules('CA');
  const ru = await loadPhoneRules('ru');

  return {
    beLen: be?.length,
    saLen: sa?.length,
    zz,
    countries: phoneCountries.length,
    countriesWithRules: loaded.filter(Boolean).length,
    unknownCountry: await loadPhoneRules('zz'),
    // The four capabilities, on the cases that would expose a broken slice.
    beFormat: beRules.format('470123456'),
    beValid: beRules.isValid('470123456'),
    beShortValid: beRules.isValid('47012345'),
    beShortLength: beRules.lengthProblem('47012345') ?? 'OK',
    beType: beRules.type('470123456'),
    beE164: beRules.toE164('0470123456'),
    caFormat: ca.format('5062345678'),
    caE164: ca.toE164('4165551234'),
    ruTollFreeE164: ru.toE164('8001234567'),
    ruTollFreeType: ru.type('8001234567'),
    // A second call must be served from cache, not a second fetch.
    cached: (await loadPhoneRules('be')) === beRules,
  };
}

// Node entry: `node app.mjs`
if (process.argv[1] && process.argv[1].endsWith('app.mjs')) {
  console.log(JSON.stringify(await run(), null, 1));
}
