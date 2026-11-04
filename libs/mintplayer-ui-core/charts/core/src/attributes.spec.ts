import { booleanAttribute, numberAttribute, optionalNumberAttribute } from './attributes';

describe('chart attribute parsing', () => {
  it('falls back for a removed or unparseable number', () => {
    expect(numberAttribute('12.5', 3)).toBe(12.5);
    expect(numberAttribute(null, 3)).toBe(3);
    expect(numberAttribute('auto', 3)).toBe(3);
  });

  it('reads an optional number as unset when removed or unparseable', () => {
    expect(optionalNumberAttribute('-4')).toBe(-4);
    expect(optionalNumberAttribute(null)).toBeUndefined();
    expect(optionalNumberAttribute('nope')).toBeUndefined();
  });

  it('restores a boolean default on removal, and only "false" switches it off', () => {
    expect(booleanAttribute(null, true)).toBe(true);
    expect(booleanAttribute('false', true)).toBe(false);
    expect(booleanAttribute('', false)).toBe(true);
  });
});
