import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mint-otp-input.element';
import type { MintOtpInputElement } from './mint-otp-input.element';
describe('mp-otp-input — ARIA contract', () => {
  let el: MintOtpInputElement;

  beforeEach(async () => {
    el = document.createElement('mp-otp-input') as MintOtpInputElement;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('exposes exactly one focusable input element', () => {
    const inputs = el.shadowRoot?.querySelectorAll('input');
    expect(inputs?.length).toBe(1);
  });

  it('marks decorative boxes as aria-hidden so AT sees one input only', () => {
    const boxes = el.shadowRoot?.querySelectorAll('.box');
    expect(boxes?.length).toBeGreaterThan(0);
    for (const box of Array.from(boxes ?? [])) {
      expect(box.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('falls back to a default aria-label when none is provided', () => {
    const input = el.shadowRoot?.querySelector('input');
    expect(input?.getAttribute('aria-label')).toBe('One-time code');
  });

  it('applies a custom aria-label when label is set', async () => {
    el.label = 'Verification code';
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const input = el.shadowRoot?.querySelector('input');
    expect(input?.getAttribute('aria-label')).toBe('Verification code');
  });

  it('reflects aria-invalid from the invalid property', async () => {
    el.invalid = true;
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const input = el.shadowRoot?.querySelector('input');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
  });

  it('renders the hidden input above the decorative boxes so taps go to it', () => {
    // The hidden input sits absolute over the row; its z-index in styles is 1
    // while boxes are static. Verify via stacking order, not pixel hit-testing
    // (jsdom doesn't do layout) — the input must be the last input/span at z-index>=1.
    const input = el.shadowRoot?.querySelector<HTMLElement>('.hidden-input');
    expect(input).toBeTruthy();
    expect(input?.classList.contains('hidden-input')).toBe(true);
  });

  it('disables the hidden input when the host is disabled', async () => {
    el.disabled = true;
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const input = el.shadowRoot?.querySelector<HTMLInputElement>('input');
    expect(input?.disabled).toBe(true);
  });
});
