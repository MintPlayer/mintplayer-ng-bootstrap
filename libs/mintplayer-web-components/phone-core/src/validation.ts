/**
 * The only module in the workspace that names `libphonenumber-js`.
 *
 * The metadata set is 233 KB minified / 57 KB gzip, so it is never part of any
 * eager bundle: this dynamic import is the single load point, and the import
 * specifier is a static literal because a computed one survives into the
 * published `.mjs` and breaks esbuild consumers.
 *
 * `/max`, not `/min`, on measured evidence: `/min` reports 22 of 244 countries'
 * one-digit-short numbers as valid (9%) where `/max` reports 7, the two format
 * identically, and `validatePhoneNumberLength` rescues none of the 22 — those
 * lengths are legal for the country, just not for that number type.
 */
let pending: Promise<typeof import('libphonenumber-js/max')> | undefined;

/**
 * Fetch the phone-number validator, at most once per page.
 *
 * Callers do structural checks (digit shape, `required`) until this resolves,
 * then switch to real per-country validation and as-you-type formatting.
 */
export function loadPhoneValidator() {
  return (pending ??= import('libphonenumber-js/max'));
}
