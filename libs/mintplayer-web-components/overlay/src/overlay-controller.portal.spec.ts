import { beforeEach, describe, expect, it } from 'vitest';
import { LitElement, html, render } from 'lit';
import { OverlayController } from './overlay-controller';
import { currentOverlayContainer, openPaneCount } from './overlay-portal';

/**
 * A light-DOM host with a portalled overlay, shaped like `mp-datatable`'s
 * filter panel: the controller owns the pane, the host renders into it.
 */
class PortalHost extends LitElement {
  readonly overlay: OverlayController = new OverlayController(this, {
    portal: true,
    anchor: () => this.querySelector<HTMLElement>('.trigger'),
    trigger: () => this.querySelector<HTMLElement>('.trigger'),
    panel: () => this.overlay.portalContainer?.querySelector<HTMLElement>('.panel') ?? null,
  });

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override render() {
    return html`<button class="trigger" type="button">open</button>`;
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    const container = this.overlay.portalContainer;
    if (container) {
      render(
        html`<div class="panel"><button class="inside" type="button">inside</button></div>`,
        container,
      );
    }
  }
}
customElements.define('portal-host', PortalHost);

async function settle(el: PortalHost) {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

async function mount() {
  document.body.innerHTML = `<button id="page">page</button><portal-host></portal-host>`;
  const el = document.querySelector('portal-host') as PortalHost;
  await settle(el);
  return el;
}

const mousedown = (target: Element) =>
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));

describe('OverlayController — portal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the panel into a pane outside the host, and tears it down on close', async () => {
    const el = await mount();

    await el.overlay.open();
    await settle(el);

    const panel = document.querySelector('.panel');
    expect(panel).not.toBeNull();
    expect(el.contains(panel)).toBe(false);
    expect(currentOverlayContainer()!.contains(panel)).toBe(true);

    el.overlay.close();
    await settle(el);
    expect(openPaneCount()).toBe(0);
    expect(currentOverlayContainer()).toBeNull();
  });

  it('exposes no pane while closed', async () => {
    const el = await mount();
    expect(el.overlay.portalContainer).toBeNull();
  });

  /**
   * THE regression this feature exists around. With the panel portalled, a
   * click inside it has a composed path containing the panel but no part of the
   * host — so testing the host alone read it as an OUTSIDE click and dismissed
   * the panel. Measured wrong in Chromium, Firefox and WebKit before the fix,
   * and invisible in a demo: it presents as a flaky dropdown, not a logic bug.
   */
  describe('outside-click, with the panel outside the host', () => {
    it('stays open on a click inside the portalled panel', async () => {
      const el = await mount();
      await el.overlay.open();
      await settle(el);
      await new Promise((r) => setTimeout(r, 10)); // the listener attaches on a timeout

      const inside = document.querySelector('.inside')!;
      expect(inside.getRootNode()).toBe(document);
      expect(el.contains(inside)).toBe(false); // genuinely outside the host

      mousedown(inside);
      expect(el.overlay.isOpen).toBe(true);
    });

    it('closes on a click elsewhere on the page', async () => {
      const el = await mount();
      await el.overlay.open();
      await settle(el);
      await new Promise((r) => setTimeout(r, 10));

      mousedown(document.getElementById('page')!);
      expect(el.overlay.isOpen).toBe(false);
    });

    it('stays open on a click on the trigger inside the host', async () => {
      const el = await mount();
      await el.overlay.open();
      await settle(el);
      await new Promise((r) => setTimeout(r, 10));

      mousedown(el.querySelector('.trigger')!);
      expect(el.overlay.isOpen).toBe(true);
    });
  });

  it('returns focus to the trigger before the pane is released', async () => {
    const el = await mount();
    const trigger = el.querySelector<HTMLElement>('.trigger')!;
    trigger.focus();

    await el.overlay.open();
    await settle(el);

    const inside = document.querySelector<HTMLElement>('.inside')!;
    inside.focus();
    expect(document.activeElement).toBe(inside);

    el.overlay.close();
    await settle(el);

    // Releasing the pane detaches whatever is focused inside it. Restore first
    // or focus lands on <body> and a keyboard user loses their place entirely.
    expect(document.activeElement).toBe(trigger);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('releases the pane when the host is torn down while open', async () => {
    const el = await mount();
    await el.overlay.open();
    await settle(el);
    expect(openPaneCount()).toBe(1);

    el.remove();
    await new Promise((r) => setTimeout(r, 0));

    // A host removed mid-open would otherwise strand its pane in <body>.
    expect(openPaneCount()).toBe(0);
    expect(currentOverlayContainer()).toBeNull();
  });

  it('leaves existing non-portalled consumers alone', async () => {
    class InPlaceHost extends LitElement {
      readonly overlay: OverlayController = new OverlayController(this, {
        anchor: () => this.querySelector<HTMLElement>('.trigger'),
        panel: () => this.querySelector<HTMLElement>('.panel'),
      });
      protected override createRenderRoot(): HTMLElement {
        return this;
      }
      protected override render() {
        return html`<button class="trigger" type="button">t</button><div class="panel">p</div>`;
      }
    }
    customElements.define('inplace-host', InPlaceHost);

    document.body.innerHTML = `<inplace-host></inplace-host>`;
    const el = document.querySelector('inplace-host') as InPlaceHost;
    await el.updateComplete;

    await el.overlay.open();
    await el.updateComplete;

    // `portal` defaults to false: no container is created and the panel stays
    // exactly where the host rendered it.
    expect(el.overlay.portalContainer).toBeNull();
    expect(currentOverlayContainer()).toBeNull();
    expect(el.contains(document.querySelector('.panel'))).toBe(true);

    el.overlay.close();
  });
});
