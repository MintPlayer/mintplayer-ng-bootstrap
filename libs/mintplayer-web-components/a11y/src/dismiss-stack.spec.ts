import { describe, it, expect, beforeEach } from 'vitest';
import { dismissStack, push, release, isTop, peek, depth } from './dismiss-stack';

describe('dismissStack', () => {
  beforeEach(() => {
    dismissStack.resetForTesting();
  });

  it('reports the most recently pushed frame as top', () => {
    const outer = push();
    const inner = push();

    expect(isTop(inner)).toBe(true);
    expect(isTop(outer)).toBe(false);
    expect(peek()).toBe(inner);
  });

  it('hands the top back to the enclosing frame on release', () => {
    const outer = push();
    const inner = push();

    release(inner);

    expect(isTop(outer)).toBe(true);
    expect(depth()).toBe(1);
  });

  it('allows releasing a non-top frame', () => {
    // How an inner layer closes itself programmatically without an Escape —
    // a popover dismissed by clicking its trigger again.
    const outer = push();
    const inner = push();

    release(outer);

    expect(isTop(inner)).toBe(true);
    expect(depth()).toBe(1);
  });

  it('gives each push a distinct identity even for the same description', () => {
    const first = push('same');
    const second = push('same');

    expect(first).not.toBe(second);
    expect(isTop(first)).toBe(false);
  });

  it('never matches a stale token against a later frame', () => {
    const stale = push();
    release(stale);
    push();

    expect(isTop(stale)).toBe(false);
  });

  it('ignores a double release', () => {
    const outer = push();
    const inner = push();

    release(inner);
    release(inner);

    expect(isTop(outer)).toBe(true);
    expect(depth()).toBe(1);
  });

  it('reports nothing as top when empty', () => {
    expect(peek()).toBeNull();
    expect(depth()).toBe(0);
    expect(isTop(Symbol('never-pushed'))).toBe(false);
  });

  it('is a single shared stack across importers', async () => {
    // The whole point: OverlayController and BsOverlayStackService must not
    // each believe they are top-most. Both reach the same module state, so a
    // frame pushed through one is visible to the other.
    const viaNamed = push('web-component-overlay');
    const { dismissStack: reimported } = await import('./dismiss-stack');

    expect(reimported.depth()).toBe(1);
    expect(reimported.isTop(viaNamed)).toBe(true);

    const viaNamespace = reimported.push('angular-overlay');
    expect(isTop(viaNamespace)).toBe(true);
    expect(isTop(viaNamed)).toBe(false);
  });
});
