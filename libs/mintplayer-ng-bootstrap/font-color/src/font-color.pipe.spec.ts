import { BsFontColorPipe } from './font-color.pipe';

describe('BsFontColorPipe', () => {
  const pipe = new BsFontColorPipe();

  it.each([
    ['#FFFFFF', '#000000'],
    ['#ffff00', '#000000'],
    ['#000000', '#FFFFFF'],
    ['#0000ff', '#FFFFFF'],
    ['#808080', '#FFFFFF'],
  ])('picks readable text on %s: %s', (background, expected) => {
    expect(pipe.transform(background)).toBe(expected);
  });

  it('falls back to the default for anything that is not a 6-digit hex string', () => {
    expect(pipe.transform(null)).toBe('#FFFFFF');
    expect(pipe.transform(undefined, '#123456')).toBe('#123456');
    expect(pipe.transform('#fff', '#abcdef')).toBe('#abcdef');
    expect(pipe.transform(1234567, '#abcdef')).toBe('#abcdef');
  });
});
