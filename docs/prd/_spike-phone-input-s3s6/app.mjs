import { loadFlag } from '@mintplayer/web-components/flags';
import { loadPhoneValidator, phoneCountries } from '@mintplayer/web-components/phone-core';

export async function run() {
  const be = await loadFlag('be');
  const sa = await loadFlag('SA');
  const zz = await loadFlag('zz');
  const lpn = await loadPhoneValidator();
  return {
    beLen: be?.length,
    saLen: sa?.length,
    zz,
    countries: phoneCountries.length,
    valid32: lpn.isValidPhoneNumber('+32470123456'),
    validBad: lpn.isValidPhoneNumber('+3247'),
    asYouType: new lpn.AsYouType('BE').input('0470123456'),
  };
}

// Node entry: `node app.mjs`
if (process.argv[1] && process.argv[1].endsWith('app.mjs')) {
  console.log(JSON.stringify(await run(), null, 1));
}
