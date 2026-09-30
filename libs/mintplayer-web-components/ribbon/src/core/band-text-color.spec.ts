import { describe, expect, it } from 'vitest';

import { BAND_TEXT_DARK, BAND_TEXT_LIGHT, bandTextColor } from './band-text-color';

describe('bandTextColor', () => {
  it.each([
    ['#FFE699', BAND_TEXT_DARK],
    ['FFE699', BAND_TEXT_DARK],
    ['  #1F4E79 ', BAND_TEXT_LIGHT],
    ['#000', BAND_TEXT_LIGHT],
    ['#ff0', BAND_TEXT_DARK],
    ['#000a', BAND_TEXT_LIGHT],
    ['#ffffff00', BAND_TEXT_DARK],
    ['#12345', BAND_TEXT_DARK],
    ['#ggg', BAND_TEXT_DARK],
    ['rgb(0, 0, 0)', BAND_TEXT_DARK],
  ])('%s takes %s text', (background, expected) => {
    expect(bandTextColor(background)).toBe(expected);
  });
});
