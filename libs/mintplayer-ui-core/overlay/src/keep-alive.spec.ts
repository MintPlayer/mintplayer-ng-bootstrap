/**
 * #465 M5 (O1-O5, core level): an overlay's markup is created on its first open
 * and kept while it is closed, hidden from sight, focus and assistive
 * technology. The fronts follow the core (`view.rendered` / `props.overlay`), so
 * this spec pins the core side; each front's `overlay-keep-alive` spec pins
 * consumer-content identity (O1) and the owner's teardown (O7).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { hostCore, patchBag as patch } from '../../_conformance/host-core';
import { contextMenuCore, connectContextMenuPanel } from '@mintplayer/ui-core/context-menu';
import { connectDropdownPanel, dropdownCore } from '@mintplayer/ui-core/dropdown';
import { modalCore, type ModalInputs } from '@mintplayer/ui-core/modal';
import { offcanvasCore } from '@mintplayer/ui-core/offcanvas';
import { connectPopoverPanel, popoverCore } from '@mintplayer/ui-core/popover';
import { connectTooltipPanel, tooltipCore } from '@mintplayer/ui-core/tooltip';
import { BODY_HOST_ATTRIBUTE, createBodyHost, refreshBodyHost } from './body-host';
import { resetOverlayStackForTesting } from './overlay-stack';
import { PHASE_ATTR } from './presence';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type Bag = Record<string, string | number | boolean | null | undefined>;

const MODAL: ModalInputs = {
  open: false,
  scrollable: false,
  centered: false,
  size: null,
  closeOnEscape: true,
  closeOnBackdrop: true,
  closeButton: true,
  closeLabel: 'Close',
};

/** A stand-in front for the modal: a body host holding the dialog and the backdrop while `view.rendered`. */
function modalFront() {
  let created = 0;
  let bodyHost: HTMLElement | null = null;
  const h = hostCore(modalCore, MODAL, {
    id: 'm1',
    models: ['open'],
    markup: ({ view }, host) => {
      patch(host, { id: 'm1', ...view.root });
      if (!view.rendered) {
        bodyHost?.remove();
        bodyHost = null;
        return;
      }
      if (!bodyHost) {
        created++;
        bodyHost = document.createElement('div');
        bodyHost.setAttribute(BODY_HOST_ATTRIBUTE, 'm1');
        bodyHost.innerHTML = '<div class="modal"><div class="modal-body"><button class="consumer">in</button></div></div><div class="modal-backdrop"></div>';
        document.body.append(bodyHost);
      }
      patch(bodyHost.children[0], view.modal as Bag);
      patch(bodyHost.children[1], view.backdrop as Bag);
    },
  });
  const modal = () => bodyHost?.children[0] as HTMLElement | undefined;
  const backdrop = () => bodyHost?.children[1] as HTMLElement | undefined;
  return { h, modal, backdrop, created: () => created };
}

/** Drives one open the way a front does: the state write, then the render it causes. */
async function open(h: { setInputs(p: Partial<ModalInputs>): void; render(): void }) {
  h.setInputs({ open: true });
  h.render();
  await flush();
  h.render();
}

describe('overlay keep-alive (#465)', () => {
  afterEach(() => {
    resetOverlayStackForTesting();
    document.body.innerHTML = '';
  });

  it('O1/O2: the modal keeps its markup after a close, hidden, with the phase stamped', async () => {
    const { h, modal, backdrop, created } = modalFront();
    h.attach();
    expect(h.props().view.rendered).toBe(false);
    expect(modal()).toBeUndefined();
    await open(h);
    expect(modal()?.getAttribute(PHASE_ATTR)).toBe('shown');
    expect(modal()?.hasAttribute('hidden')).toBe(false);
    const first = modal();
    h.setInputs({ open: false });
    h.render();
    expect(h.state().phase).toBe('closed');
    expect(h.props().view.rendered).toBe(true);
    expect(modal()).toBe(first);
    expect(modal()?.getAttribute(PHASE_ATTR)).toBe('closed');
    expect(modal()?.hasAttribute('hidden')).toBe(true);
    expect(backdrop()?.hasAttribute('hidden')).toBe(true);
    expect(created()).toBe(1);
  });

  it('O3/O4: the second open waits for the entering render, then traps focus again', async () => {
    const { h, modal, created } = modalFront();
    h.attach();
    await open(h);
    h.setInputs({ open: false });
    h.render();
    (document.activeElement as HTMLElement | null)?.blur();

    h.setInputs({ open: true });
    // The kept root is still the closed one: presence must not open it yet.
    expect(h.state().phase).toBe('entering');
    expect(document.activeElement?.classList.contains('consumer')).toBe(false);
    h.render();
    expect(modal()?.getAttribute(PHASE_ATTR)).toBe('entering');
    expect(modal()?.hasAttribute('hidden')).toBe(false);
    await flush();
    expect(h.state().phase).toBe('shown');
    h.render();
    expect(modal()?.classList.contains('show')).toBe(true);
    expect(document.activeElement?.classList.contains('consumer')).toBe(true);
    expect(created()).toBe(1);
  });

  it('O1/O2: the tooltip keeps its panel; the trigger stops naming it while closed', async () => {
    let created = 0;
    let panel: HTMLElement | null = null;
    const h = hostCore(tooltipCore, { position: 'top' }, {
      id: 't1',
      markup: (props, host) => {
        patch(host, { id: 't1', ...props.anchor });
        if (!props.overlay) return undefined;
        if (!panel) {
          created++;
          const bodyHost = document.createElement('div');
          bodyHost.setAttribute(BODY_HOST_ATTRIBUTE, 't1');
          panel = document.createElement('div');
          bodyHost.append(panel);
          document.body.append(bodyHost);
        }
        patch(panel, connectTooltipPanel(props.overlay).root as Bag);
        return undefined;
      },
    });
    h.attach();
    h.host.dispatchEvent(new FocusEvent('focusin'));
    h.render();
    await flush();
    h.render();
    expect(panel!.getAttribute(PHASE_ATTR)).toBe('shown');
    expect(h.host.getAttribute('aria-describedby')).toBe('t1-tooltip');
    h.host.dispatchEvent(new FocusEvent('focusout'));
    h.render();
    expect(h.state().phase).toBe('closed');
    expect(h.props().overlay).toMatchObject({ phase: 'closed' });
    expect(panel!.hasAttribute('hidden')).toBe(true);
    expect(h.host.hasAttribute('aria-describedby')).toBe(false);
    h.host.dispatchEvent(new FocusEvent('focusin'));
    h.render();
    await flush();
    h.render();
    expect(panel!.getAttribute(PHASE_ATTR)).toBe('shown');
    expect(created).toBe(1);
  });

  it('O2: every overlay core hides each body-hosted root once closed, and keeps it', () => {
    const closed = { phase: 'closed', kept: true } as const;
    const view = <S,>(core: { view: (a: never) => unknown }, inputs: unknown, state: S) =>
      core.view({ inputs, state, id: 'x', hydrated: true, context: undefined, label: null, api: () => null } as never) as never;

    const modal = view<unknown>(modalCore, MODAL, { open: false, ...closed }) as { view: { rendered: boolean; modal: Bag; backdrop: Bag } };
    expect(modal.view.rendered).toBe(true);
    expect([modal.view.modal['hidden'], modal.view.backdrop['hidden'], modal.view.modal[PHASE_ATTR]]).toEqual([true, true, 'closed']);

    const offcanvas = view<unknown>(offcanvasCore, { ...MODAL, position: 'start', size: null, backdrop: true, noPadding: false }, { open: false, ...closed }) as {
      view: { rendered: boolean; panel: Bag; backdrop: Bag };
    };
    expect(offcanvas.view.rendered).toBe(true);
    expect([offcanvas.view.panel['hidden'], offcanvas.view.backdrop['hidden'], offcanvas.view.panel[PHASE_ATTR]]).toEqual([true, true, 'closed']);

    const directives: [unknown, unknown, unknown, (o: never) => Bag][] = [
      [tooltipCore, { position: 'top' }, { side: 'top', describedBy: null }, (o) => connectTooltipPanel(o).root as Bag],
      [popoverCore, { position: 'bottom', title: null }, { side: 'bottom', promote: false, triggerId: null }, (o) => connectPopoverPanel(o).root as Bag],
      [dropdownCore, { placement: 'bottom-start' }, { side: 'bottom', promote: false, triggerId: null }, (o) => connectDropdownPanel(o) as Bag],
      [contextMenuCore, { disabled: false, label: 'Menu' }, {}, (o) => connectContextMenuPanel(o) as Bag],
    ];
    directives.map(([core, inputs, state, panel]) => {
      const props = view<unknown>(core as never, inputs, { ...(state as object), ...closed }) as { overlay: unknown };
      expect(props.overlay).toMatchObject({ phase: 'closed' });
      const root = panel(props.overlay as never);
      expect([root['hidden'], root[PHASE_ATTR]]).toEqual([true, 'closed']);
    });
  });

  it('O2: a never-opened overlay renders nothing (and SSR still emits no body host, O6)', () => {
    const fresh = hostCore(modalCore, MODAL, { id: 'm2' });
    expect(fresh.props().view.rendered).toBe(false);
    const tip = hostCore(tooltipCore, { position: 'top' }, { id: 't2' });
    expect(tip.props().overlay).toBeNull();
  });

  it('O5: a kept body host follows data-bs-theme / dir / lang changed while closed', () => {
    const from = document.createElement('section');
    from.setAttribute('data-bs-theme', 'light');
    from.setAttribute('dir', 'rtl');
    document.body.append(from);
    const host = createBodyHost(document, 'h1', from);
    expect([host.getAttribute('data-bs-theme'), host.getAttribute('dir')]).toEqual(['light', 'rtl']);
    from.setAttribute('data-bs-theme', 'dark');
    from.removeAttribute('dir');
    from.setAttribute('lang', 'nl');
    refreshBodyHost(host);
    expect([host.getAttribute('data-bs-theme'), host.getAttribute('dir'), host.getAttribute('lang')]).toEqual(['dark', null, 'nl']);
  });
});
