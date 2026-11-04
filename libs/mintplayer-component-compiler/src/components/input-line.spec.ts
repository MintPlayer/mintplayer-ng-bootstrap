/**
 * The Angular input line of a compiled component or directive. Pins the
 * primary-input rule: the input aliased to the directive's own selector
 * accepts the empty string a bare `*bsX` / `<span bsX>` binds, as its default.
 */
import { describe, expect, it } from 'vitest';
import { inputLine } from './emit-angular.mjs';

const MODEL = { inputsType: 'XInputs', names: { selector: '[bsX]' } };

describe('Angular inputLine', () => {
  it("maps '' to the default on the input aliased to the selector", () => {
    const line = inputLine(MODEL, { name: 'placement', default: "'top'", kind: 'string', alias: 'bsX' });
    expect(line).toContain(
      "input<XInputs['placement'], XInputs['placement'] | ''>('top', { transform: (v: XInputs['placement'] | '') => (v === '' ? 'top' : v), alias: 'bsX' })",
    );
  });

  it('leaves a prefixed alias (a microsyntax key) untransformed', () => {
    const line = inputLine(MODEL, { name: 'title', default: 'null', kind: 'string', alias: 'bsXTitle' });
    expect(line).toContain("input<XInputs['title']>(null, { alias: 'bsXTitle' })");
  });

  it('keeps the boolean transform on a boolean input', () => {
    const line = inputLine(MODEL, { name: 'sameWidth', default: 'false', kind: 'boolean', alias: 'bsXSameWidth' });
    expect(line).toContain('transform: booleanAttribute');
  });

  // #461: numberAttribute(undefined | null | '') is NaN, so an unset `[yMin]` reached the core as NaN.
  it('maps an unset number input to its default, not NaN', () => {
    const line = inputLine(MODEL, { name: 'yMin', default: 'null', kind: 'number' });
    const transform = transformOf(line);
    expect(transform(undefined)).toBeNull();
    expect(transform(null)).toBeNull();
    expect(transform('')).toBeNull();
    expect(transform('12.5')).toBe(12.5);
    expect(transform(0)).toBe(0);
  });

  it('falls back to a numeric default and to undefined when there is none', () => {
    expect(transformOf(inputLine(MODEL, { name: 'size', default: '5', kind: 'number' }))(undefined)).toBe(5);
    expect(transformOf(inputLine(MODEL, { name: 'span', kind: 'number' }))(null)).toBeUndefined();
  });
});

/** Evaluates the emitted transform (types stripped) with Angular's numberAttribute semantics. */
function transformOf(line: string): (v: unknown) => unknown {
  const match = /transform: \(v: unknown\) => (.*?) as XInputs\['\w+'\]/.exec(line);
  if (!match) throw new Error(`no number transform in: ${line}`);
  const numberAttribute = (v: unknown, fallback = NaN) =>
    !isNaN(parseFloat(v as string)) && !isNaN(Number(v)) ? Number(v) : fallback;
  return new Function('numberAttribute', `return (v) => ${match[1]};`)(numberAttribute);
}
