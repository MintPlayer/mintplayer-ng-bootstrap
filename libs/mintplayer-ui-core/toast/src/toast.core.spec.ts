import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { connectToaster, toastBodyCore, toastCore, toasterCore, toastHeaderCore, type ToastInputs, type ToasterInputs } from './toast.core';
import type { ToastSource } from './toast-queue';

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => document.body.replaceChildren());

describe('toast views', () => {
  it('renders the header, body and placements', () => {
    expect(hostCore(toastHeaderCore, { dismissible: true, closeLabel: 'Close' }, { hydrated: false }).props().close).toMatchObject({ 'aria-label': 'Close', hidden: '' });
    expect(hostCore(toastHeaderCore, { dismissible: true, closeLabel: 'Close' }, { hydrated: true }).props().close?.['hidden']).toBeNull();
    expect(hostCore(toastHeaderCore, { dismissible: false, closeLabel: 'Close' }).props().close).toBeNull();
    expect(hostCore(toastBodyCore, {}).props().root).toEqual({ class: 'toast-body' });
    expect(connectToaster({ queue: null, placement: 'top-center' }, []).root['class']).toContain('translate-middle-x');
    expect(connectToaster({ queue: null, placement: 'nowhere' as never }, []).root['class']).toContain('bottom-0 end-0');
  });
});

describe('toastCore', () => {
  const mount = (o: Partial<ToastInputs> = {}) => {
    const h = hostCore(toastCore, { visible: false, politeness: 'polite', ...o }, {
      markup: ({ root }, host) => (applyBag(host, root), [el('div', { class: 'toast-header' }, el('button', { 'data-toast-dismiss': '' }, 'x')), el('div', null, 'Hello')]),
    });
    h.attach();
    return h;
  };

  it('starts in the phase of its first value', () => {
    expect(mount({ visible: true }).state().phase).toBe('shown');
    expect(mount().state().phase).toBe('hidden');
  });

  it('fades in over two frames, announcing its text, and fades out', async () => {
    const h = mount();
    h.setInputs({ visible: true });
    expect(h.state()).toEqual({ visible: true, phase: 'entering' });
    await frame();
    await frame();
    expect(h.state().phase).toBe('shown');
    await wait(120);
    expect(document.querySelector('[data-mp-page-announcer="polite"]')?.textContent).toBe('xHello');

    h.setInputs({ visible: false });
    expect(h.state().phase).toBe('leaving');
    // Shown again before the fade ends: the pending fade is cancelled.
    h.setInputs({ visible: true });
    h.setInputs({ visible: false });
    await wait(200);
    expect(h.state().phase).toBe('hidden');
    h.setInputs({ politeness: 'assertive' });
    expect(h.state().phase).toBe('hidden');
  });

  it('closes from its dismiss button only', async () => {
    const h = mount({ visible: true });
    h.host.querySelector<HTMLElement>('.toast-header')!.click();
    expect(h.events('visibleChange')).toEqual([]);
    h.host.querySelector<HTMLElement>('[data-toast-dismiss]')!.click();
    expect(h.state().visible).toBe(false);
    expect(h.events('visibleChange')).toEqual([false]);
    await wait(200);
    expect(h.state().phase).toBe('hidden');
  });

  it('cancels a pending fade when disposed', () => {
    const h = mount();
    h.setInputs({ visible: true });
    h.dispose();
    const gone = mount({ visible: true });
    gone.setInputs({ visible: false });
    gone.dispose();
  });
});

describe('toasterCore', () => {
  /** A queue that records holds and releases and lets the spec push a state. */
  const source = (toasts: unknown[] = []) => {
    let listener: ((s: { toasts: never[] }) => void) | null = null;
    const q = {
      toasts: toasts as never[],
      subscribe: vi.fn((fn) => ((listener = fn), () => (listener = null))),
      hold: vi.fn(),
      release: vi.fn(),
      push: (next: unknown[]) => listener?.({ toasts: next as never[] }),
    };
    return q as ToastSource & typeof q;
  };

  const mount = (o: Partial<ToasterInputs> = {}) => {
    const h = hostCore(toasterCore, { queue: null, placement: 'bottom-end', ...o }, {
      markup: ({ view }, host) => (applyBag(host, view.root), [el('button', null, 'a'), el('button', null, 'b')]),
    });
    h.attach();
    return h;
  };

  it('renders the queue’s toasts and follows it', () => {
    const q = source([{ id: 1 }]);
    const h = mount({ queue: q });
    expect(h.state().toasts).toHaveLength(1);
    q.push([{ id: 1 }, { id: 2 }]);
    expect(h.state().toasts).toHaveLength(2);
    const other = source();
    h.setInputs({ queue: other });
    expect(h.state().toasts).toEqual([]);
    expect(q.release).toHaveBeenCalled();
    h.setInputs({ placement: 'top-end' });
    h.setInputs({ queue: null });
    expect(h.state().toasts).toEqual([]);
    expect(mount().state().toasts).toEqual([]);
  });

  it('holds the autohide while pointed at or focused, and releases it when both leave', () => {
    const q = source();
    const h = mount({ queue: q });
    const [a, b] = Array.from(h.host.querySelectorAll('button'));
    h.host.dispatchEvent(new Event('pointerenter'));
    expect(q.hold).toHaveBeenCalledTimes(1);
    a.focus();
    expect(q.hold).toHaveBeenCalledTimes(2);

    // Pointer leaves while focus stays inside: still held.
    h.host.dispatchEvent(new Event('pointerleave'));
    expect(q.release).not.toHaveBeenCalled();
    // Focus moves within: still held.
    b.focus();
    expect(q.release).not.toHaveBeenCalled();
    // Focus leaves while hovered: still held.
    const hover = vi.spyOn(h.host, 'matches').mockReturnValue(true);
    b.blur();
    expect(q.release).not.toHaveBeenCalled();
    hover.mockReturnValue(false);
    a.focus();
    a.blur();
    expect(q.release).toHaveBeenCalledTimes(1);
    h.host.dispatchEvent(new Event('pointerleave'));
    expect(q.release).toHaveBeenCalledTimes(2);

    h.dispose();
    expect(q.release).toHaveBeenCalledTimes(3);
  });
});
