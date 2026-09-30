/**
 * Four lines of argument handling in front of something that kills processes,
 * and a `dependsOn` of the Angular demo's serve — so a parse that accepts a
 * bad port would run a port reclaim against NaN on every `nx serve`.
 *
 * The module is side-effect-free on import (the reclaim sits behind runCli),
 * and main() takes the reclaim as a parameter, so nothing here kills anything.
 */
import { describe, expect, it, vi } from 'vitest';

import { isValidPort, main, parseArgs } from './free-port.mjs';

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

describe('main', () => {
  it('reclaims the parsed port under the given label and exits 0', async () => {
    const reclaim = vi.fn(async () => 0);
    expect(await main({ argv: ['4200', 'ng-demo'], reclaim })).toBe(0);
    expect(reclaim).toHaveBeenCalledWith(4200, { label: 'ng-demo' });
  });

  it('waits for the reclaim to finish before reporting success', async () => {
    let released = false;
    const reclaim = async () => {
      await new Promise((r) => setTimeout(r, 5));
      released = true;
    };
    await main({ argv: ['4200'], reclaim });
    expect(released).toBe(true);
  });

  it('prints usage and exits 1 without reclaiming anything on a bad port', async () => {
    const reclaim = vi.fn();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(await main({ argv: ['abc'], reclaim })).toBe(1);
      expect(error).toHaveBeenCalledWith('[free-port] usage: node tools/scripts/free-port.mjs <port> [label]');
      expect(reclaim).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});
