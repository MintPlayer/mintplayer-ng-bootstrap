import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { connectContextMenuPanel, contextMenuCore, contextMenuPanelCore, type ContextMenuInputs, type ContextMenuProps } from './context-menu.core';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined));
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

/** The consumer's element carries the directive; the panel renders at the end of <body> while open. */
function mount(o: Partial<ContextMenuInputs> = {}, menu = true) {
  let panel: HTMLElement | null = null;
  const sync = ({ anchor, overlay }: ContextMenuProps, host: HTMLElement) => {
    applyBag(host, anchor);
    if (!overlay) {
      panel?.remove();
      panel = null;
      return undefined;
    }
    panel ??= document.body.appendChild(
      el('div', connectContextMenuPanel(overlay),
        menu
          ? el('div', { class: 'dropdown-menu show' },
            el('div', { class: 'dropdown-item disabled' }, el('button', { type: 'button' }, 'Cut')),
            el('div', { class: 'dropdown-item' }, el('button', { type: 'button' }, 'Copy')))
          : el('p', null, 'Nothing here')),
    );
    applyBag(panel, connectContextMenuPanel(overlay));
    return undefined;
  };
  const host = document.body.appendChild(el('div', { tabindex: '0' }, 'Target'));
  const h = hostCore(contextMenuCore, { label: 'Context menu', disabled: false, ...o }, { host, markup: sync });
  h.attach();
  const update = async () => {
    h.render();
    await tick();
    h.render();
  };
  const rightClick = async (x = 10, y = 20) => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y });
    h.host.dispatchEvent(event);
    await update();
    return event;
  };
  return { ...h, update, rightClick, panel: () => panel };
}

describe('context menu views', () => {
  it('connects the anchor and the panel', () => {
    expect(hostCore(contextMenuCore, { label: 'x', disabled: false }).props()).toEqual({ anchor: { 'data-mp-context-menu': 'mp-test-context-menu' }, overlay: null });
    expect(hostCore(contextMenuPanelCore, { overlayId: '', shown: true }).props().root).toEqual({ class: 'context-menu-panel show', id: null, tabindex: -1 });
  });
});

describe('contextMenuCore attached', () => {
  it('opens at the pointer on a right-click, names the menu and focuses its first enabled item', async () => {
    const h = mount();
    h.host.focus();
    const event = await h.rightClick();
    expect(event.defaultPrevented).toBe(true);
    expect(h.state().phase).toBe('shown');
    expect(h.panel()?.querySelector('.dropdown-menu')?.getAttribute('aria-label')).toBe('Context menu');
    expect(document.activeElement?.textContent).toBe('Copy');
    await h.rightClick(30, 40);
    expect(h.state().phase).toBe('shown');

    h.panel()!.querySelector<HTMLElement>('.dropdown-item.disabled button')!.click();
    expect(h.state().phase).toBe('shown');
    h.panel()!.querySelectorAll<HTMLElement>('button')[1].click();
    await h.update();
    expect(h.state().phase).toBe('closed');
    expect(document.activeElement).toBe(h.host);
  });

  it('opens from the keyboard with Shift+F10 and the ContextMenu key, not other keys', async () => {
    const h = mount();
    const plain = new KeyboardEvent('keydown', { key: 'F10', bubbles: true, cancelable: true });
    h.host.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
    h.host.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }));
    await h.update();
    expect(h.state().phase).toBe('shown');
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await h.update();
    expect(h.state().phase).toBe('closed');
    h.host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, cancelable: true }));
    await h.update();
    expect(h.state().phase).toBe('shown');
  });

  it('leaves the browser menu alone while disabled, and focuses an itemless panel', async () => {
    const off = mount({ disabled: true });
    expect((await off.rightClick()).defaultPrevented).toBe(false);
    off.dispose();
    const bare = mount({}, false);
    await bare.rightClick();
    expect(document.activeElement).toBe(bare.panel());
  });

  it('closes on a page scroll, on the window losing focus, and on focus leaving the panel', async () => {
    const h = mount();
    await h.rightClick();
    h.panel()!.dispatchEvent(new Event('scroll'));
    document.dispatchEvent(new Event('scroll'));
    expect(h.state().phase).toBe('shown');
    h.host.dispatchEvent(new Event('scroll'));
    await h.update();
    expect(h.state().phase).toBe('closed');

    await h.rightClick();
    window.dispatchEvent(new Event('blur'));
    await h.update();
    expect(h.state().phase).toBe('closed');

    await h.rightClick();
    const item = h.panel()!.querySelectorAll('button')[1];
    item.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: h.panel()!.querySelector('button') }));
    item.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(h.state().phase).toBe('shown');
    item.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: h.host }));
    await h.update();
    expect(h.state().phase).toBe('closed');
  });
});
