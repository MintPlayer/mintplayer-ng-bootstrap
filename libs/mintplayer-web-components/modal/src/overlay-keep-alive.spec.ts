import { afterEach, describe, expect, it, vi } from 'vitest';
import { html, render } from 'lit';

import '@mintplayer/web-components/modal';
import { bsTooltip } from '@mintplayer/web-components/tooltip';

/**
 * #465 M5 O1/O7: an overlay's consumer content is created on the first open and
 * kept across close → reopen (its own state survives); removing the owner
 * removes the content and its body host. `mp-modal` (`bodyTeleport`) and
 * `bsTooltip` (`coreDirective`'s overlay) cover the two Lit overlay paths.
 */
let constructed = 0;

class ProbeContent extends HTMLElement {
  bumps = 0;
  constructor() {
    super();
    constructed++;
  }
}
customElements.define('probe-overlay-content', ProbeContent);

const settle = async () => {
  await new Promise((r) => setTimeout(r, 0));
  await Promise.all(Array.from(document.querySelectorAll('mp-modal')).map((m) => (m as unknown as { updateComplete: Promise<unknown> }).updateComplete));
  await new Promise((r) => setTimeout(r, 0));
};

const probes = () => Array.from(document.body.querySelectorAll<ProbeContent>('probe-overlay-content'));

describe('Lit overlay keep-alive (#465)', () => {
  const root = document.createElement('div');
  afterEach(() => {
    render(html``, root);
    root.remove();
    document.body.querySelectorAll('[data-mp-overlay]').forEach((el) => el.remove());
  });

  it('O1/O7: mp-modal keeps its content across close and reopen, and removes it with the element', async () => {
    constructed = 0;
    document.body.append(root);
    const view = (open: boolean) => html`<mp-modal .open=${open}><probe-overlay-content></probe-overlay-content></mp-modal>`;
    render(view(true), root);
    await settle();
    const first = probes()[0];
    expect(first).toBeDefined();
    first.bumps = 1;
    render(view(false), root);
    await settle();
    expect(probes()[0]).toBe(first);
    expect(first.closest('.modal')?.hasAttribute('hidden')).toBe(true);
    render(view(true), root);
    await settle();
    expect(probes()[0]).toBe(first);
    expect(first.bumps).toBe(1);
    expect(constructed).toBe(1);
    render(html``, root);
    await settle();
    expect(probes()).toEqual([]);
    expect(document.body.querySelector('[data-mp-overlay]')).toBeNull();
  });

  it('O1/O7: bsTooltip keeps its content across hide and show, and removes it with the trigger', async () => {
    constructed = 0;
    document.body.append(root);
    render(html`<button class="trigger" ${bsTooltip({}, () => html`<probe-overlay-content></probe-overlay-content>`)}>trigger</button>`, root);
    await settle();
    const trigger = root.querySelector<HTMLElement>('.trigger')!;
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    const first = probes()[0];
    expect(first).toBeDefined();
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle();
    expect(probes()[0]).toBe(first);
    // Closed after the fade: jsdom computes the part's `.fade` transition, so presence waits it out.
    await vi.waitFor(() => expect(first.closest('.tooltip')?.hasAttribute('hidden')).toBe(true));
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    expect(probes()[0]).toBe(first);
    expect(constructed).toBe(1);
    render(html``, root);
    await settle();
    expect(probes()).toEqual([]);
    expect(document.body.querySelector('[data-mp-overlay]')).toBeNull();
  });
});
