import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { connectPopoverPanel, popoverCore, popoverPanelCore, type PopoverInputs, type PopoverProps } from './popover.core';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const box = (top: number, height: number) => ({ left: 100, top, width: 80, height, right: 180, bottom: top + height, x: 100, y: top, toJSON: () => ({}) }) as DOMRect;

/** The trigger's top, by test: near the bottom of the viewport the panel flips above it. */
let triggerTop = 100;

beforeEach(() => {
  triggerTop = 100;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.classList.contains('popover') ? box(0, 100) : box(triggerTop, 20);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function mount(o: Partial<PopoverInputs> = {}, trigger: HTMLElement = el('span', null, 'Info')) {
  let panel: HTMLElement | null = null;
  const sync = ({ anchor, overlay }: PopoverProps, host: HTMLElement) => {
    applyBag(host, anchor);
    if (!overlay) {
      panel?.remove();
      panel = null;
      return undefined;
    }
    const view = connectPopoverPanel(overlay);
    panel ??= document.body.appendChild(el('div', view.root, el('div', view.body, el('button', null, 'Inside'))));
    panel.className = String(view.root['class']);
    return undefined;
  };
  const host = document.body.appendChild(trigger);
  const h = hostCore(popoverCore, { position: 'bottom', title: null, ...o }, { host, markup: sync });
  h.attach();
  const update = async () => {
    h.render();
    await tick();
    h.render();
  };
  const press = async (key: string) => {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    h.host.dispatchEvent(ev);
    await update();
    return ev;
  };
  return { ...h, update, press, panel: () => panel };
}

describe('popover views', () => {
  it('names the panel from its title, else from the trigger, and falls back to the bottom side', () => {
    const titled = connectPopoverPanel({ overlayId: 'p', side: 'nowhere' as never, shown: true, heading: 'Tip', triggerId: null });
    expect(titled.root).toMatchObject({ class: 'popover bs-popover-bottom fade show', 'aria-labelledby': 'p-title' });
    expect(titled.header).toEqual({ class: 'popover-header', id: 'p-title' });
    const plain = hostCore(popoverPanelCore, { overlayId: '', side: 'top', shown: false, heading: null, triggerId: 't' }).props().view;
    expect(plain).toMatchObject({ header: null, title: '', root: { id: null, 'aria-labelledby': 't' } });
  });
});

describe('popoverCore', () => {
  it('promotes a plain trigger to a focusable button with an id, and opens it from the keyboard', async () => {
    const h = mount();
    expect(h.host.id).toBe('mp-test');
    expect(h.state()).toMatchObject({ promote: true, triggerId: 'mp-test' });
    h.render();
    expect(h.host.getAttribute('role')).toBe('button');
    expect((await h.press('x')).defaultPrevented).toBe(false);
    expect((await h.press('Enter')).defaultPrevented).toBe(true);
    expect(h.state().phase).toBe('shown');
    expect(h.host.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(h.panel());
    await h.press(' ');
    expect(h.state().phase).toBe('closed');
  });

  it('names a trigger without an id after its panel, and leaves a native button unpromoted', async () => {
    const trigger = el('button', { 'data-mp-popover': 'help-popover' });
    const h = hostCore(popoverCore, { position: 'bottom', title: 'T' }, { host: document.body.appendChild(trigger), id: 'x' });
    trigger.removeAttribute('id');
    h.attach(false);
    expect(trigger.id).toBe('help-trigger');
    expect(h.state().promote).toBe(false);
    // No id and no panel name either: a generic one.
    const bare = document.body.appendChild(el('button'));
    const runtime = hostCore(popoverCore, { position: 'bottom', title: null }, { host: bare });
    bare.removeAttribute('id');
    runtime.attach(false);
    expect(bare.id).toBe('mp-popover-trigger');
    expect((await mountKeyOnButton()).defaultPrevented).toBe(false);
  });

  it('toggles on click, flips above a trigger near the bottom, and follows a resize', async () => {
    triggerTop = 700;
    const h = mount({ position: 'bottom' });
    h.host.click();
    await h.update();
    expect(h.state().side).toBe('top');
    expect(h.panel()!.className).toContain('bs-popover-top');
    triggerTop = 100;
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));
    await frame();
    expect(h.state().side).toBe('bottom');
    h.host.click();
    await h.update();
    expect(h.state().phase).toBe('closed');
  });

  it('closes on Escape, returning focus, and when focus leaves both panel and trigger', async () => {
    const h = mount({ title: 'Help' });
    h.host.click();
    await h.update();
    expect(h.props().overlay).toMatchObject({ heading: 'Help', triggerId: null });
    h.panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await h.update();
    expect(h.state().phase).toBe('closed');
    expect(document.activeElement).toBe(h.host);

    h.host.click();
    await h.update();
    const inside = h.panel()!.querySelector('button')!;
    inside.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: h.host }));
    inside.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(h.state().phase).toBe('shown');
    const outside = document.body.appendChild(el('input'));
    inside.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await h.update();
    expect(h.state().phase).toBe('closed');
    h.dispose();
  });
});

/** Enter on a natively focusable trigger is the button's own business. */
async function mountKeyOnButton() {
  const h = mount({}, el('button', null, 'Native'));
  return h.press('Enter');
}
