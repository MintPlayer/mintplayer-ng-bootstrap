import { loadFlag } from '@mintplayer/web-components/flags';
import { loadPhoneRules, phoneCountries } from '@mintplayer/web-components/phone-core';

export async function run() {
  const be = await loadFlag('be');
  const sa = await loadFlag('SA');
  const zz = await loadFlag('zz');

  // The S9 spread plus the countries that exercise the shared-calling-code path.
  const spread = ['be', 'nl', 'de', 'fr', 'gb', 'us', 'ca', 'it', 'ru', 'cn', 'in', 'br', 'au', 'jp', 'sa', 'kz', 'va'];
  const loaded = await Promise.all(spread.map((iso) => loadPhoneRules(iso)));

  const beRules = await loadPhoneRules('be');
  const ca = await loadPhoneRules('CA');
  const ru = await loadPhoneRules('ru');
  const us = await loadPhoneRules('us');

  return {
    beLen: be?.length,
    saLen: sa?.length,
    zz,
    countries: phoneCountries.length,
    countriesWithRules: loaded.filter(Boolean).length,
    unknownCountry: await loadPhoneRules('zz'),
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
    // The cross-sibling case: a Canadian number on a US-selected field.
    usAcceptsCanadian: us.isValid('5062345678'),
    // US and CA share one chunk, so the second load is already resolved.
    sharesChunk: (await loadPhoneRules('ca')) === ca,
    cached: (await loadPhoneRules('be')) === beRules,
  };
}

// Node entry: `node app.mjs`
if (process.argv[1] && process.argv[1].endsWith('app.mjs')) {
  console.log(JSON.stringify(await run(), null, 1));
}
