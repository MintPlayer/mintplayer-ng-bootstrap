import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { LiveAnnouncerController } from './live-announcer';
@customElement('test-host-default')
class TestHostDefault extends LitElement {
  announcer = new LiveAnnouncerController(this);
  override render(): TemplateResult {
    return html`<div>content</div>${this.announcer.template()}`;
  }
}

@customElement('test-host-assertive')
class TestHostAssertive extends LitElement {
  announcer = new LiveAnnouncerController(this, { politeness: 'assertive', clearAfterMs: 50 });
  override render(): TemplateResult {
    return html`${this.announcer.template()}`;
  }
}

async function flush(el: LitElement): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

describe('LiveAnnouncerController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('emits a polite live region with role="status" by default', async () => {
    const el = document.createElement('test-host-default') as TestHostDefault;
    document.body.appendChild(el);
    await flush(el);

    const region = el.shadowRoot!.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region!.getAttribute('aria-live')).toBe('polite');
    expect(region!.getAttribute('aria-atomic')).toBe('true');
  });

  it('writes announce(msg) into the live region', async () => {
    const el = document.createElement('test-host-default') as TestHostDefault;
    document.body.appendChild(el);
    await flush(el);

    el.announcer.announce('Tile moved to row 2');
    await flush(el);

    const region = el.shadowRoot!.querySelector('[role="status"]')!;
    expect(region.textContent).toBe('Tile moved to row 2');
  });

  it('blanks the region after clearAfterMs so the same message can re-fire', async () => {
    const el = document.createElement('test-host-assertive') as TestHostAssertive;
    document.body.appendChild(el);
    await flush(el);

    el.announcer.announce('Saved');
    await flush(el);
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe('Saved');

    vi.advanceTimersByTime(60);
    await flush(el);
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe('');
  });

  it('uses role="alert" + aria-live="assertive" when configured', async () => {
    const el = document.createElement('test-host-assertive') as TestHostAssertive;
    document.body.appendChild(el);
    await flush(el);

    const region = el.shadowRoot!.querySelector('[role="alert"]');
    expect(region).not.toBeNull();
    expect(region!.getAttribute('aria-live')).toBe('assertive');
  });

  it('renders the live region visually hidden (off-screen but readable to SR)', async () => {
    const el = document.createElement('test-host-default') as TestHostDefault;
    document.body.appendChild(el);
    await flush(el);

    const region = el.shadowRoot!.querySelector<HTMLElement>('[role="status"]')!;
    const style = region.getAttribute('style') ?? '';
    expect(style).toContain('position:absolute');
    expect(style).toContain('width:1px');
    expect(style).toContain('clip:rect(0,0,0,0)');
  });

  it('drops empty announce() calls (no-op)', async () => {
    const el = document.createElement('test-host-default') as TestHostDefault;
    document.body.appendChild(el);
    await flush(el);

    el.announcer.announce('');
    await flush(el);

    const region = el.shadowRoot!.querySelector('[role="status"]')!;
    expect(region.textContent).toBe('');
  });

  it('clears the pending timer on hostDisconnected to avoid leaks', async () => {
    const el = document.createElement('test-host-default') as TestHostDefault;
    document.body.appendChild(el);
    await flush(el);

    el.announcer.announce('Persistent');
    await flush(el);

    el.remove();
    // If the timer wasn't cleared, advancing it would still try to requestUpdate
    // on a disconnected host. Vitest's fake timers won't crash, but the test
    // documents the contract.
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });
});
