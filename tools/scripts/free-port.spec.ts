/**
 * Four lines of argument handling in front of something that kills processes,
 * and a `dependsOn` of the Angular demo's serve — so a parse that accepts a
 * bad port would run a port reclaim against NaN on every `nx serve`.
 *
 * The module is side-effect-free on import (the reclaim sits behind an
 * isEntryPoint guard), so importing it here kills nothing.
 */
import { describe, expect, it } from 'vitest';

import { isValidPort, parseArgs } from './free-port.mjs';

describe('parseArgs', () => {
  it('reads the port and the label positionally', () => {
    expect(parseArgs(['4200', 'ng-demo'])).toEqual({ port: 4200, label: 'ng-demo' });
  });

  it('defaults the label to the script name', () => {
    expect(parseArgs(['4200'])).toEqual({ port: 4200, label: 'free-port' });
  });

  it('reports NaN for a missing port rather than throwing', () => {
    expect(parseArgs([]).port).toBeNaN();
  });

  it('reports NaN for a non-numeric port', () => {
    expect(parseArgs(['http']).port).toBeNaN();
  });

  // parseInt stops at the first non-digit, so a fractional argument arrives as
  // a whole number — which isValidPort then accepts. Documented, not a bug:
  // the only usage error worth distinguishing is "no usable port at all".
  it('truncates a fractional port', () => {
    expect(parseArgs(['4200.9']).port).toBe(4200);
  });
});

describe('isValidPort', () => {
  it.each([
    ['a dev-server port', 4200, true],
    ['port 1', 1, true],
    ['zero', 0, false],
    ['a negative port', -1, false],
    ['NaN from a missing argument', Number.NaN, false],
  ])('%s -> %s', (_label, port, expected) => {
    expect(isValidPort(port)).toBe(expected);
  });
});
