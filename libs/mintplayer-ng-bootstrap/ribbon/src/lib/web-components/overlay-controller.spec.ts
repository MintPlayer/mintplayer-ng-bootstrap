import { describe, expect, it } from 'vitest';
import { OverlayController } from './overlay-controller';

/**
 * The shared static stack on OverlayController is what makes nested ribbon
 * overlays unwind one-at-a-time on Esc (FR-7 / FR-14). These tests cover the
 * primitive directly; the full open/close lifecycle is exercised through the
 * mp-ribbon-group / mp-ribbon-dropdown-button specs and the Playwright e2e.
 */
describe('OverlayController — shared Esc-stack primitives', () => {
  it('pushFrame() returns a unique symbol and lifts it to the top', () => {
    const a = OverlayController.pushFrame();
    const b = OverlayController.pushFrame();
    expect(a).not.toBe(b);
    expect(OverlayController.isFrameTop(b)).toBe(true);
    expect(OverlayController.isFrameTop(a)).toBe(false);
    OverlayController.releaseFrame(b);
    OverlayController.releaseFrame(a);
  });

  it('releaseFrame() restores the previous top', () => {
    const a = OverlayController.pushFrame();
    const b = OverlayController.pushFrame();
    OverlayController.releaseFrame(b);
    expect(OverlayController.isFrameTop(a)).toBe(true);
    OverlayController.releaseFrame(a);
  });

  it('releasing a non-top token is allowed (overlay closes itself programmatically)', () => {
    const a = OverlayController.pushFrame();
    const b = OverlayController.pushFrame();
    OverlayController.releaseFrame(a);
    expect(OverlayController.isFrameTop(b)).toBe(true);
    OverlayController.releaseFrame(b);
  });

  it('isFrameTop() returns false for a never-pushed token', () => {
    const stray = Symbol('not-on-stack');
    expect(OverlayController.isFrameTop(stray)).toBe(false);
  });
});
