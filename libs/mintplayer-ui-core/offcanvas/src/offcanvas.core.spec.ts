import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { connectOffcanvas, offcanvasCore, type OffcanvasInputs, type OffcanvasView } from './offcanvas.core';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const inputs = (o: Partial<OffcanvasInputs> = {}): OffcanvasInputs => ({
  open: false,
  position: 'start',
  size: null,
  backdrop: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  closeButton: true,
  closeLabel: 'Close',
  noPadding: false,
  ...o,
});

afterEach(() => document.body.replaceChildren());

/** The panel renders into a body host while open, its backdrop beside it; a re-render keeps the nodes. */
function mount(o: Partial<OffcanvasInputs> = {}) {
  let overlay: HTMLElement | null = null;
  const sync = ({ view }: { view: OffcanvasView }, host: HTMLElement) => {
    applyBag(host, view.root);
    if (!view.rendered) {
      overlay?.remove();
      overlay = null;
      return undefined;
    }
    overlay ??= document.body.appendChild(el('div', { 'data-mp-overlay': '' },
      el('div', view.panel,
        el('div', view.header, el('h5', view.title, 'Menu'), view.close && el('button', view.close)),
        el('div', view.body, 'Body')),
      view.backdrop && el('div', view.backdrop)));
    overlay.querySelector('.offcanvas')!.className = String(view.panel['class']);
    return undefined;
  };
  const h = hostCore(offcanvasCore, inputs(o), { markup: sync });
  h.attach();
  const update = async () => {
    h.render();
    await tick();
    h.render();
  };
  const panel = () => document.querySelector<HTMLElement>('.offcanvas')!;
  const backdrop = () => document.querySelector<HTMLElement>('.offcanvas-backdrop');
  return { ...h, update, panel, backdrop };
}

describe('offcanvas view', () => {
  it('sizes the panel along its axis and falls back to the start edge', () => {
    expect(connectOffcanvas(inputs({ size: 300 }), 'shown', 'o', null).panelStyle).toEqual({ '--bs-offcanvas-width': '300px' });
    expect(connectOffcanvas(inputs({ size: 120, position: 'top' }), 'leaving', 'o', null)).toMatchObject({
      panelStyle: { '--bs-offcanvas-height': '120px' },
      panel: { class: 'offcanvas offcanvas-top hiding' },
    });
    const plain = connectOffcanvas(inputs({ position: 'left' as never, size: 0, backdrop: false, closeButton: false, noPadding: true }), 'closed', 'o', 'Nav');
    expect(plain).toMatchObject({ panelStyle: {}, close: null, backdrop: null, body: { class: 'offcanvas-body p-0' } });
    expect(plain.panel).toMatchObject({ class: 'offcanvas offcanvas-start', 'aria-modal': null, 'aria-label': 'Nav', 'aria-labelledby': null });
  });
});

describe('offcanvasCore', () => {
  it('opens through its input and closes from the dismiss button', async () => {
    const h = mount();
    h.setInputs({ open: true });
    await h.update();
    expect(h.state()).toEqual({ open: true, phase: 'shown' });
    h.panel().querySelector<HTMLElement>('.offcanvas-title')!.click();
    expect(h.state().open).toBe(true);
    h.panel().querySelector<HTMLElement>('.btn-close')!.click();
    await h.update();
    expect(h.state()).toEqual({ open: false, phase: 'closed' });
    expect(h.events('openChange')).toEqual([false]);
  });

  it('closes on a backdrop click and on Escape, when allowed', async () => {
    const h = mount({ open: true, closeOnBackdrop: false, closeOnEscape: false });
    await h.update();
    h.backdrop()!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(h.state().open).toBe(true);
    h.setInputs({ closeOnBackdrop: true });
    h.backdrop()!.click();
    await h.update();
    expect(h.state().open).toBe(false);

    h.setInputs({ open: true, closeOnEscape: true });
    await h.update();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await h.update();
    expect(h.state().open).toBe(false);
  });

  it('works without a backdrop, closes through its input and stops once disposed', async () => {
    const h = mount({ open: true, backdrop: false });
    await h.update();
    expect(h.backdrop()).toBeNull();
    h.setInputs({ open: false });
    await h.update();
    expect(h.state()).toEqual({ open: false, phase: 'closed' });
    h.setInputs({ open: false, size: 10 });
    h.setInputs({ open: true });
    expect(h.state().open).toBe(true);
    h.dispose();
  });
});
