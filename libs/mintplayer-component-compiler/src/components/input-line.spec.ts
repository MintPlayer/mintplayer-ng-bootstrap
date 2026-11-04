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
});
