import { beforeEach, describe, expect, it } from 'vitest';
import './mp-radio';
import type { MpRadio } from './mp-radio';

/**
 * Naming contract for `<mp-radio>` — the same contract as `mp-checkbox`, whose
 * aria spec carries the full rationale (and the ElementInternals stub proving the
 * re-sync). This file asserts the radio-specific surface: both render paths, and
 * the type switch that replaces the `<input>`.
 *
 * As everywhere: the positive cross-root reference path is not unit-testable
 * (jsdom has no `ariaLabelledByElements` and no accessibility tree); spike 0.2
 * verified it, and the slotted-label spike (verdict in docs/prd/screen-reader-accessibility-plan.md) verified that slotted text names the
 * control natively.
 */
async function mount(html: string): Promise<{ host: MpRadio; input: HTMLInputElement }> {
  document.body.innerHTML = html;
  const host = document.querySelector('mp-radio') as MpRadio;
  await host.updateComplete;
  return { host, input: host.shadowRoot!.querySelector('input') as HTMLInputElement };
}

describe('mp-radio naming', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the inner <input> from input-label', async () => {
    const { input } = await mount('<mp-radio input-label="Standard shipping"></mp-radio>');
    expect(input.getAttribute('aria-label')).toBe('Standard shipping');
  });

  it('lets a host aria-label win over input-label', async () => {
    const { input } = await mount(
      '<mp-radio aria-label="From host" input-label="From property"></mp-radio>',
    );
    expect(input.getAttribute('aria-label')).toBe('From host');
  });

  it('writes NO aria-label when the consumer slots visible text', async () => {
    // The slotted text names the control natively (flat-tree label association);
    // an aria-label here would override that correct name with a drifting copy.
    const { input } = await mount('<mp-radio>Standard shipping</mp-radio>');
    expect(input.hasAttribute('aria-label')).toBe(false);
  });

  it('does NOT copy IDREF strings into the shadow root', async () => {
    const { input } = await mount(
      '<span id="outer">Shipping</span><mp-radio aria-labelledby="outer" aria-describedby="outer"></mp-radio>',
    );
    expect(input.hasAttribute('aria-labelledby')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('applies input-label to the toggle_button variant too', async () => {
    const { input } = await mount(
      '<mp-radio type="toggle_button" input-label="Align left"></mp-radio>',
    );
    expect(input.getAttribute('aria-label')).toBe('Align left');
  });

  it('keeps the name when type switches, which replaces the <input>', async () => {
    const { host } = await mount('<mp-radio input-label="Align left"></mp-radio>');
    host.type = 'toggle_button';
    await host.updateComplete;

    const input = host.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Align left');
  });

  it('keeps the name live when input-label changes', async () => {
    const { host, input } = await mount('<mp-radio input-label="First"></mp-radio>');
    host.setAttribute('input-label', 'Second');
    await host.updateComplete;
    expect(input.getAttribute('aria-label')).toBe('Second');
  });
});
