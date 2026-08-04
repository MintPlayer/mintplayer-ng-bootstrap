// The 244 ISO 3166-1 alpha-2 codes that carry a dial code, in `intl-tel-input`'s
// own order. Hard-coded (not imported) so the browser-side fixture and the Node
// script compare exactly the same list without bundling the package.
export const ISO_CODES = [
  'af', 'ax', 'al', 'dz', 'as', 'ad', 'ao', 'ai', 'ag', 'ar', 'am', 'aw', 'ac', 'au', 'at', 'az',
  'bs', 'bh', 'bd', 'bb', 'by', 'be', 'bz', 'bj', 'bm', 'bt', 'bo', 'ba', 'bw', 'br', 'io', 'vg',
  'bn', 'bg', 'bf', 'bi', 'kh', 'cm', 'ca', 'cv', 'bq', 'ky', 'cf', 'td', 'cl', 'cn', 'cx', 'cc',
  'co', 'km', 'cg', 'cd', 'ck', 'cr', 'ci', 'hr', 'cu', 'cw', 'cy', 'cz', 'dk', 'dj', 'dm', 'do',
  'ec', 'eg', 'sv', 'gq', 'er', 'ee', 'sz', 'et', 'fk', 'fo', 'fj', 'fi', 'fr', 'gf', 'pf', 'ga',
  'gm', 'ge', 'de', 'gh', 'gi', 'gr', 'gl', 'gd', 'gp', 'gu', 'gt', 'gg', 'gn', 'gw', 'gy', 'ht',
  'hn', 'hk', 'hu', 'is', 'in', 'id', 'ir', 'iq', 'ie', 'im', 'il', 'it', 'jm', 'jp', 'je', 'jo',
  'kz', 'ke', 'ki', 'xk', 'kw', 'kg', 'la', 'lv', 'lb', 'ls', 'lr', 'ly', 'li', 'lt', 'lu', 'mo',
  'mg', 'mw', 'my', 'mv', 'ml', 'mt', 'mh', 'mq', 'mr', 'mu', 'yt', 'mx', 'fm', 'md', 'mc', 'mn',
  'me', 'ms', 'ma', 'mz', 'mm', 'na', 'nr', 'np', 'nl', 'nc', 'nz', 'ni', 'ne', 'ng', 'nu', 'nf',
  'kp', 'mk', 'mp', 'no', 'om', 'pk', 'pw', 'ps', 'pa', 'pg', 'py', 'pe', 'ph', 'pl', 'pt', 'pr',
  'qa', 're', 'ro', 'ru', 'rw', 'ws', 'sm', 'st', 'sa', 'sn', 'rs', 'sc', 'sl', 'sg', 'sx', 'sk',
  'si', 'sb', 'so', 'za', 'kr', 'ss', 'es', 'lk', 'bl', 'sh', 'kn', 'lc', 'mf', 'pm', 'vc', 'sd',
  'sr', 'sj', 'se', 'ch', 'sy', 'tw', 'tj', 'tz', 'th', 'tl', 'tg', 'tk', 'to', 'tt', 'tn', 'tr',
  'tm', 'tc', 'tv', 'vi', 'ug', 'ua', 'ae', 'gb', 'us', 'uy', 'uz', 'vu', 'va', 've', 'vn', 'wf',
  'eh', 'ye', 'zm', 'zw',
];

export const LOCALES = ['en-US', 'nl-BE', 'fr-FR', 'de-DE', 'ar-EG', 'ja-JP'];

// The codes the PRD singles out as "awkward" — deprecated, exceptionally
// reserved, or user-assigned (XK is not ISO at all).
export const AWKWARD = ['xk', 'ac', 'ta', 'dg', 'bq', 'sx', 'eh', 'io'];

export function namesFor(locale, codes = ISO_CODES) {
  const dn = new Intl.DisplayNames(locale, { type: 'region' });
  return Object.fromEntries(codes.map((c) => [c, dn.of(c.toUpperCase()) ?? null]));
}
