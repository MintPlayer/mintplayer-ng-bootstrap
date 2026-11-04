import { applyBag, el, hostCore } from '../../_conformance/host-core';
import {
  connectDropdownDisclosure,
  connectDropdownItem,
  connectDropdownPanel,
  dropdownCore,
  dropdownDividerCore,
  dropdownHeaderCore,
  dropdownItemCore,
  dropdownMenuCore,
  dropdownPanelCore,
  NAVIGATION_NESTING,
  type DropdownInputs,
  type DropdownProps,
} from './dropdown.core';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => document.body.replaceChildren());

/**
 * The trigger is the consumer's element (the `[bsDropdown]` directive), and the
 * panel renders at the end of <body> while `overlay` is set, as the fronts do.
 */
function mount(o: Partial<DropdownInputs> = {}, trigger: HTMLElement = el('button', { type: 'button' }), menu = true) {
  let panel: HTMLElement | null = null;
  const sync = ({ anchor, overlay }: DropdownProps, host: HTMLElement) => {
    applyBag(host, anchor);
    if (!overlay) {
      panel?.remove();
      panel = null;
      return undefined;
    }
    if (!panel) {
      panel = el('div', connectDropdownPanel(overlay),
        menu
          ? el('div', { class: 'dropdown-menu show' },
            el('div', { class: 'dropdown-item' }, el('a', { href: '#one' }, 'One')),
            el('div', { class: 'dropdown-item disabled' }, el('a', { href: '#off' }, 'Off')),
            el('div', { class: 'dropdown-item' }, el('button', { type: 'button' }, 'Two')))
          : el('input'));
      document.body.append(panel);
    }
    applyBag(panel, connectDropdownPanel(overlay));
    return undefined;
  };
  const h = hostCore(dropdownCore, { placement: 'bottom-start', sameWidth: false, hasPopup: 'menu', ...o }, { host: trigger, markup: sync });
  h.attach();
  const update = async () => {
    h.render();
    await tick();
    h.render();
  };
  const press = async (key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    h.host.dispatchEvent(event);
    await update();
    return event;
  };
  return { ...h, update, press, panel: () => panel };
}

describe('dropdown views', () => {
  it('connects the trigger and the panel', () => {
    const closed = hostCore(dropdownCore, { placement: 'nowhere' as never, sameWidth: false, hasPopup: 'dialog' }).props();
    expect(closed.anchor).toMatchObject({ 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': null, role: null });
    expect(closed.overlay).toBeNull();
    expect(connectDropdownPanel({ overlayId: '', side: 'top', shown: true, hasPopup: 'dialog', triggerId: 't' }))
      .toEqual({ class: 'dropdown-panel show', id: null, 'data-side': 'top', role: 'dialog', tabindex: -1, 'aria-labelledby': 't' });
    expect(hostCore(dropdownPanelCore, { overlayId: 'p', side: 'bottom', shown: false, hasPopup: 'menu', triggerId: null }).props().root)
      .toMatchObject({ class: 'dropdown-panel', role: null, 'aria-labelledby': null });
    expect(dropdownPanelCore.provide?.({} as never)).toEqual({ mode: 'menu', depth: -1 });
  });

  it('renders items, headers, dividers and the navbar disclosure', () => {
    expect(connectDropdownItem({ active: true, disabled: true, value: null })).toEqual({ class: 'dropdown-item active disabled' });
    expect(connectDropdownItem({ active: true, disabled: false, value: null }, 'navigation'))
      .toEqual({ class: 'dropdown-item active', 'aria-current': 'true', 'aria-disabled': null });
    expect(hostCore(dropdownHeaderCore, {}).props().root).toEqual({ class: 'dropdown-header' });
    expect(hostCore(dropdownDividerCore, {}).props().root).toEqual({ class: 'dropdown-divider' });
    expect(connectDropdownDisclosure({ depth: 0, active: true }).summary['class']).toBe('nav-link dropdown-toggle active');
    const sub = connectDropdownDisclosure({ depth: 2, hydrated: true });
    expect(sub.details).toEqual({ class: 'dropdown dropdown-submenu', name: 'mp-navbar-2' });
    expect(sub.panel['popover']).toBe('manual');
  });

  it('renders a menu, or a disclosure inside a navbar, and nests the context', () => {
    const menuInputs = { maxHeight: null, label: 'Actions', active: false };
    const menu = hostCore(dropdownMenuCore, menuInputs, { context: { mode: 'menu', depth: -1 }, hydrated: true });
    expect(menu.props().nav).toBeNull();
    expect(menu.props().root['aria-label']).toBe('Actions');
    expect(dropdownMenuCore.host?.(menu.props())).toEqual({ class: 'dropdown-contents' });
    const nav = hostCore(dropdownMenuCore, { ...menuInputs, active: true }, { context: NAVIGATION_NESTING });
    expect(nav.props()).toMatchObject({ label: 'Actions', nav: { details: { name: 'mp-navbar-0' } } });
    expect(hostCore(dropdownMenuCore, { ...menuInputs, label: null }, { context: NAVIGATION_NESTING }).props().label).toBeUndefined();
    expect(dropdownMenuCore.provide?.({ context: NAVIGATION_NESTING } as never)).toEqual({ mode: 'navigation', depth: 0 });
  });
});

describe('dropdownMenuCore / dropdownItemCore attached', () => {
  it('caps the menu height, follows the cap, and attaches nothing in a navbar', () => {
    const menu = hostCore(dropdownMenuCore, { maxHeight: 0, label: null, active: false }, { context: { mode: 'menu', depth: -1 } });
    menu.attach();
    expect(menu.host.style.getPropertyValue('--mp-dropdown-max-height')).toBe('0px');
    menu.setInputs({ maxHeight: undefined });
    expect(menu.host.style.getPropertyValue('--mp-dropdown-max-height')).toBe('');
    menu.dispose();

    const details = hostCore(dropdownMenuCore, { maxHeight: 10, label: null, active: false }, { host: document.createElement('details'), context: NAVIGATION_NESTING });
    details.attach();
    details.setInputs({ maxHeight: 20 });
    expect(details.host.style.getPropertyValue('--mp-dropdown-max-height')).toBe('');
  });

  it('emits the selected item, carrying the item value', () => {
    const itemHost = el('div', { class: 'dropdown-item' }, el('button', { type: 'button' }, 'Pick'));
    const menuHost = el('div', { class: 'dropdown-menu' }, itemHost);
    const menu = hostCore(dropdownMenuCore, { maxHeight: null, label: null, active: false }, { host: menuHost, context: { mode: 'menu', depth: -1 }, hydrated: true });
    menu.attach();
    const item = hostCore(dropdownItemCore, { active: false, disabled: false, value: { id: 1 } }, { host: itemHost, context: { mode: 'menu', depth: 0 } });
    item.attach();
    item.setInputs({ value: { id: 2 } });
    expect(item.props().root).toEqual({ class: 'dropdown-item' });
    itemHost.querySelector('button')!.click();
    expect(menu.events('itemSelect').map((d) => (d as { value: unknown }).value)).toEqual([{ id: 2 }]);
  });
});

describe('dropdownCore attached', () => {
  it('gives the trigger an id, opens on click onto the first item, and names the menu', async () => {
    const h = mount();
    expect(h.host.id).toBe('mp-test');
    h.host.click();
    await h.update();
    expect(h.state().phase).toBe('shown');
    expect(h.host.getAttribute('aria-expanded')).toBe('true');
    expect(h.panel()?.querySelector('.dropdown-menu')?.getAttribute('aria-labelledby')).toBe('mp-test');
    expect(document.activeElement?.textContent).toBe('One');
    h.host.click();
    await h.update();
    expect(h.state().phase).toBe('closed');
    expect(h.panel()).toBeNull();
  });

  it('names a trigger without an id after its panel, and promotes a non-focusable one to a button', async () => {
    const trigger = el('span');
    trigger.setAttribute('data-mp-dropdown', 'menu7-dropdown');
    const h = hostCore(dropdownCore, { placement: 'top-end', sameWidth: true, hasPopup: 'menu' }, { host: trigger, markup: () => undefined });
    trigger.removeAttribute('id');
    h.attach();
    expect(trigger.id).toBe('menu7-trigger');
    expect(h.state()).toMatchObject({ promote: true, side: 'top' });
    const keyed = mount({}, el('span'));
    await keyed.press('Enter');
    expect(keyed.state().phase).toBe('shown');
    await keyed.press(' ');
    expect(keyed.state().phase).toBe('closed');
    expect((await keyed.press('x')).defaultPrevented).toBe(false);
  });

  it('opens on the last item with ArrowUp, ignores Enter on a native button', async () => {
    const h = mount();
    expect((await h.press('Enter')).defaultPrevented).toBe(false);
    expect((await h.press('ArrowUp')).defaultPrevented).toBe(true);
    expect(document.activeElement?.textContent).toBe('Two');
    await h.press('ArrowDown');
    expect(h.state().phase).toBe('shown');
  });

  it('closes when an item is activated, returning focus to the trigger', async () => {
    const h = mount();
    await h.press('ArrowDown');
    h.panel()!.querySelector<HTMLElement>('.dropdown-item.disabled a')!.click();
    expect(h.state().phase).toBe('shown');
    h.panel()!.querySelector('button')!.click();
    await h.update();
    expect(h.state().phase).toBe('closed');
    expect(document.activeElement).toBe(h.host);
  });

  it('closes when focus leaves panel and trigger, not when it moves between them', async () => {
    const h = mount({ sameWidth: true });
    await h.press('ArrowDown');
    expect(h.panel()!.style.getPropertyValue('--mp-dropdown-width')).toBe('0px');
    const link = h.panel()!.querySelector('a')!;
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: h.host }));
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(h.state().phase).toBe('shown');
    const outside = document.body.appendChild(el('button'));
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await h.update();
    expect(h.state().phase).toBe('closed');
  });

  it('closes on Escape, refocusing the trigger', async () => {
    const h = mount();
    await h.press('ArrowDown');
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await h.update();
    expect(h.state().phase).toBe('closed');
    expect(document.activeElement).toBe(h.host);
  });

  it('focuses a dialog panel itself, and tears down on dispose', async () => {
    const h = mount({ hasPopup: 'dialog' }, undefined, false);
    h.host.click();
    await h.update();
    expect(document.activeElement).toBe(h.panel());
    expect(h.panel()!.getAttribute('role')).toBe('dialog');
    h.dispose();
  });
});
