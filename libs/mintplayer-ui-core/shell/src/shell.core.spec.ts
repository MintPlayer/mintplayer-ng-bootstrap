import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { shellCore, type ShellComponentView, type ShellInputs } from './shell.core';

afterEach(() => document.body.replaceChildren());

const inputs = (o: Partial<ShellInputs> = {}): ShellInputs => ({
  state: 'auto' as never,
  breakpoint: 'md',
  size: null,
  externalToggle: false,
  dismissOnNavigate: true,
  labels: null,
  ...o,
});

/** The shell's markup, stamped with its scope; the sidebar holds a link, a no-dismiss item and a nested shell's toggle. */
const markup = ({ view }: { view: ShellComponentView }, host: HTMLElement) => {
  applyBag(host, view.root);
  const s = { 'data-mps': 'shell' };
  return [
    el('a', { ...view.skip, ...s, href: view.skipHref }, view.skipText),
    ...view.toggles.map((t) => el('input', { ...t.input, ...s })),
    el('div', { ...view.sidebarRoot, ...s },
      el('nav', { ...view.sidebar, ...s },
        el('a', { href: '/page' }, 'Page'),
        el('div', { 'data-no-dismiss': '' }, el('a', { href: '/group' }, 'Group')),
        el('span', null, 'Text'),
        el('input', { type: 'checkbox', class: 'shell-toggle' }))),
    el('main', { ...view.content, ...s }, 'Content'),
  ];
};

function mount(o: Partial<ShellInputs> = {}) {
  const h = hostCore(shellCore, inputs(o), { markup });
  h.attach();
  const toggle = (mode: string) => h.host.querySelector<HTMLInputElement>(`.shell-toggle-${mode}`)!;
  const click = (target: Element) => {
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    return ev;
  };
  return { ...h, toggle, click };
}

describe('shellCore', () => {
  it('sizes the sidebar through a custom property', () => {
    expect(hostCore(shellCore, inputs({ size: '18rem' })).props().view.sizeStyle).toEqual({ '--mp-shell-size': '18rem' });
    expect(hostCore(shellCore, inputs()).props().view.sizeStyle).toEqual({});
  });

  it('reports its own toggles flipping, never a nested shell’s or another input', () => {
    const h = mount();
    const narrow = h.toggle('narrow');
    narrow.checked = true;
    narrow.dispatchEvent(new Event('change', { bubbles: true }));
    h.host.querySelector('nav .shell-toggle')!.dispatchEvent(new Event('change', { bubbles: true }));
    h.host.querySelector('nav')!.appendChild(el('select')).dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.events('stateChange')).toEqual([{ open: true }]);
  });

  it('focuses the content from the skip link', () => {
    const h = mount();
    expect(h.click(h.host.querySelector('.skip-link')!).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(h.host.querySelector('.content'));
  });

  it('closes the narrow drawer on a link in the sidebar, unless marked no-dismiss', () => {
    const h = mount({ state: 'show' as never });
    expect(h.toggle('narrow').checked).toBe(true);
    h.click(h.host.querySelector('[data-no-dismiss] a')!);
    h.click(h.host.querySelector('nav span')!);
    h.click(h.host.querySelector('.content')!);
    expect(h.events('stateChange')).toEqual([]);
    h.click(h.host.querySelector('nav > a')!);
    expect(h.toggle('narrow').checked).toBe(false);
    expect(h.events('stateChange')).toEqual([{ open: false }]);
  });

  it('keeps the drawer when navigation does not dismiss it', () => {
    const h = mount({ state: 'show' as never, dismissOnNavigate: false });
    h.click(h.host.querySelector('nav > a')!);
    expect(h.toggle('narrow').checked).toBe(true);
  });

  it('toggles through its method and applies a new state to flipped checkboxes', () => {
    const h = mount();
    h.call('toggle');
    expect(h.toggle('narrow').checked).toBe(true);
    h.call('toggle', false);
    expect(h.events('stateChange')).toEqual([{ open: true }, { open: false }]);
    h.setInputs({ state: 'show' as never });
    expect([h.toggle('narrow').checked, h.toggle('wide').checked]).toEqual([true, true]);
    h.setInputs({ size: '1px' });
    h.host.replaceChildren();
    h.call('toggle');
    expect(h.events('stateChange')).toHaveLength(2);
    h.dispose();
  });
});
