import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { modalCore, type ModalInputs, type ModalView } from './modal.core';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const inputs = (o: Partial<ModalInputs> = {}): ModalInputs => ({
  open: false,
  scrollable: false,
  centered: false,
  size: null,
  closeOnEscape: true,
  closeOnBackdrop: true,
  closeButton: true,
  closeLabel: 'Close',
  ...o,
});

afterEach(() => document.body.replaceChildren());

/** The dialog renders into a body host while open, its backdrop beside it; a re-render keeps the nodes. */
function mount(o: Partial<ModalInputs> = {}) {
  let overlay: HTMLElement | null = null;
  const sync = ({ view }: { view: ModalView }, host: HTMLElement) => {
    applyBag(host, view.root);
    if (!view.rendered) {
      overlay?.remove();
      overlay = null;
      return undefined;
    }
    overlay ??= document.body.appendChild(el('div', { 'data-mp-overlay': '' },
      el('div', view.modal, el('div', view.dialog, el('div', view.content,
        el('div', view.header, el('h5', view.title, 'Title'), view.close && el('button', view.close)),
        el('div', view.body, el('input'))))),
      el('div', view.backdrop)));
    overlay.querySelector('.modal')!.className = String(view.modal['class']);
    return undefined;
  };
  const h = hostCore(modalCore, inputs(o), { markup: sync });
  h.attach();
  const update = async () => {
    h.render();
    await tick();
    h.render();
  };
  const modal = () => document.querySelector<HTMLElement>('.modal')!;
  return { ...h, update, modal };
}

const press = (target: HTMLElement, down: EventTarget = target) => {
  down.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

describe('modalCore', () => {
  it('opens through its input and closes from the dismiss button', async () => {
    const h = mount();
    expect(h.props().view.rendered).toBe(false);
    h.setInputs({ open: true });
    await h.update();
    expect(h.state()).toEqual({ open: true, phase: 'shown' });
    expect(h.modal().className).toContain('show');
    h.modal().querySelector<HTMLElement>('.modal-title')!.click();
    expect(h.state().open).toBe(true);
    h.modal().querySelector<HTMLElement>('.btn-close')!.click();
    await h.update();
    expect(h.state()).toEqual({ open: false, phase: 'closed' });
    expect(h.events('openChange')).toEqual([false]);
  });

  it('closes on a backdrop click that started on the backdrop, not one that started inside', async () => {
    const h = mount({ open: true });
    await h.update();
    expect(h.state().phase).toBe('shown');
    press(h.modal(), h.modal().querySelector('input')!);
    expect(h.state().open).toBe(true);
    press(h.modal());
    await h.update();
    expect(h.state().open).toBe(false);
  });

  it('honours closeOnBackdrop and closeOnEscape', async () => {
    const h = mount({ open: true, closeOnBackdrop: false, closeOnEscape: false });
    await h.update();
    press(h.modal());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(h.state().open).toBe(true);
    h.setInputs({ closeOnEscape: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await h.update();
    expect(h.state().open).toBe(false);
    expect(h.events('openChange')).toEqual([false]);
  });

  it('closes through its input, ignoring a repeat, and stops once disposed', async () => {
    const h = mount({ open: true });
    await h.update();
    h.setInputs({ open: false });
    await h.update();
    expect(h.state()).toEqual({ open: false, phase: 'closed' });
    expect(h.events('openChange')).toEqual([]);
    h.setInputs({ open: false, centered: true });
    h.setInputs({ open: true });
    expect(h.state().open).toBe(true);
    h.dispose();
  });
});
