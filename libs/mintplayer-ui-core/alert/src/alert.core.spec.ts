import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { alertClasses, alertCore, connectAlert, rescueFocus, type AlertInputs, type AlertView } from './alert.core';

afterEach(() => document.body.replaceChildren());

const inputs = (o: Partial<AlertInputs> = {}): AlertInputs => ({
  color: 'warning' as never,
  announce: true,
  dismissible: true,
  closeLabel: 'Close',
  visible: true,
  ...o,
});

function mount(o: Partial<AlertInputs> = {}) {
  const markup = ({ view }: { view: AlertView }, host: HTMLElement) =>
    (applyBag(host, view.root), [el('p', null, 'Saved'), view.dismiss && el('button', view.dismiss)].filter((n): n is HTMLElement => !!n));
  const before = document.body.appendChild(el('button', null, 'Before'));
  const h = hostCore(alertCore, inputs(o), { models: ['visible'], markup });
  const after = document.body.appendChild(el('button', null, 'After'));
  h.attach();
  return { ...h, before, after, close: () => h.host.querySelector<HTMLElement>('.btn-close')! };
}

describe('alert views', () => {
  it('colours, announces and hides the close button until hydrated', () => {
    expect(alertClasses('nope', false)).toBe('alert alert-primary');
    const server = connectAlert(inputs({ announce: false }), false, false);
    expect(server.root).toMatchObject({ class: 'alert alert-warning alert-dismissible', role: null, hidden: '' });
    expect(server.dismiss?.['hidden']).toBe('');
    expect(connectAlert(inputs({ dismissible: false }), true, true).dismiss).toBeNull();
  });
});

describe('alertCore', () => {
  it('closes from its own button, moving focus to the next control', () => {
    const h = mount();
    h.close().focus();
    h.close().click();
    expect(h.state().visible).toBe(false);
    expect(h.changes('visible')).toEqual([false]);
    expect(document.activeElement).toBe(h.after);
  });

  it('falls back to the last control before it, and leaves focus alone when it is elsewhere', () => {
    const h = mount();
    h.after.remove();
    h.close().focus();
    rescueFocus(h.host);
    expect(document.activeElement).toBe(h.before);
    rescueFocus(h.host);
    expect(document.activeElement).toBe(h.before);
  });

  it('ignores other clicks and a nested alert’s button, and follows the consumer', () => {
    const h = mount();
    h.host.querySelector<HTMLElement>('p')!.click();
    const nested = h.host.querySelector('p')!.appendChild(el('button', { 'data-alert-dismiss': '' }));
    nested.click();
    expect(h.state().visible).toBe(true);
    h.setInputs({ visible: false });
    expect(h.state().visible).toBe(false);
    h.setInputs({ color: 'info' as never });
    h.setInputs({ visible: true });
    h.close().click();
    h.setInputs({ visible: false });
    expect(h.state().visible).toBe(false);
    h.dispose();
  });
});
