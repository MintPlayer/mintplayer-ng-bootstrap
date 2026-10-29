import { rovingTarget } from '@mintplayer/ui-core/roving';

/**
 * The dropdown menu has no machine (PRD #437 §8, wave B): it is a Bootstrap
 * `.dropdown-menu` list whose items are consumer markup. What the fronts share
 * is the menu's bag, and one DOM attachment that owns the menu behaviour over
 * whatever items the consumer rendered: menuitem roles, the roving tabindex,
 * Arrow/Home/End navigation, Enter/Space activation of a bare item, and the
 * `select` callback. It has no trigger or positioning of its own (the navbar
 * dropdown and `[bsDropdownMenu]` do that); the menu flows in place, shown.
 *
 * Markup (every front renders the same):
 *
 *   <ul class="dropdown-menu show" data-mps=dropdown-menu role=menu aria-label>
 *     <li class="dropdown-item"><a href>…</a></li>
 *     <li class="dropdown-divider"></li>
 *     <li class="dropdown-header">…</li>
 *   </ul>
 *
 * No-JS: `role=menu` is written only once hydrated. A menu role without the
 * `menuitem`s JS assigns is invalid, not merely incomplete; without it the
 * server output is a plain list of links, which is valid and works.
 *
 * An item is disabled via the `.disabled` class (or `aria-disabled="true"`), and
 * carries an opaque value, read in this order: a `dropdownValue` JS property
 * (any value, passed through unchanged; see `DropdownItemElement`), a
 * `data-value` attribute (a string), then the element's own `value` (an
 * authored `value` attribute on an `<li>` is its native number). Never assign an
 * object or a string to an `<li>`'s `value` property: `HTMLLIElement.value` is a
 * native long and coerces it to 0.
 */

export type DropdownMenuBag = Record<string, string | boolean | null>;

export const DROPDOWN_MENU_SCOPE = 'dropdown-menu';

/**
 * A `.dropdown-item` carrying an opaque value for the menu's `select` callback.
 * Assign any value (object, string, number) to `dropdownValue`; the menu reports
 * it unchanged. This is the channel the fronts use.
 */
export type DropdownItemElement = HTMLElement & { dropdownValue?: unknown };

/** What the menu reports when an enabled item is activated. */
export interface DropdownSelectEventDetail {
  /** The activated `.dropdown-item` element. */
  item: HTMLElement;
  /** The item's opaque value, if set (see `DropdownItemElement`). */
  value?: unknown;
}

export interface DropdownMenuOptions {
  /** Accessible name for the menu list. */
  readonly label?: string | null;
  /** Id of the element naming the menu (its trigger); used when no `label` is given. */
  readonly labelledBy?: string | null;
  /** Written by the front once it has rendered on the client: gates `role=menu` (see the no-JS note). */
  readonly hydrated: boolean;
}

/**
 * The menu list's bag. It carries no `data-mps` (S15): whoever renders it stamps
 * its own scope, the compiled navbar its group's, the hand-written fronts
 * `DROPDOWN_MENU_SCOPE`.
 */
export function connectDropdownMenu(options: DropdownMenuOptions): DropdownMenuBag {
  return {
    class: 'dropdown-menu show',
    role: options.hydrated ? 'menu' : null,
    'aria-label': options.label || null,
    'aria-labelledby': options.label ? null : options.labelledBy || null,
  };
}

/** The menu that owns a node: the nearest `.dropdown-menu` ancestor (or itself). */
const ownerMenu = (el: Element): Element | null => el.closest('.dropdown-menu');

/**
 * The interactive items of THIS menu, in DOM order. Items of a nested menu
 * (a navbar submenu) are excluded, so each menu manages only its own.
 */
export function dropdownMenuItems(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>('.dropdown-item')].filter((el) => ownerMenu(el) === menu);
}

/** The focusable control of an item: the item itself when it is one, else its first `<a>`/`<button>`/`<summary>`. */
export function dropdownItemControl(item: HTMLElement): HTMLElement {
  return item.matches('a, button, summary') ? item : (item.querySelector<HTMLElement>('a, button, summary') ?? item);
}

export function dropdownItemDisabled(item: HTMLElement): boolean {
  return item.classList.contains('disabled') || item.getAttribute('aria-disabled') === 'true';
}

export function dropdownItemValue(item: HTMLElement): unknown {
  const opaque = (item as DropdownItemElement).dropdownValue;
  if (opaque !== undefined) return opaque;
  const prop = (item as HTMLElement & { value?: unknown }).value;
  // <li> has a NATIVE numeric `value` (its <ol> ordinal, default 0), so for a
  // bare <li class="dropdown-item"> the property is always "set": trust it only
  // when the consumer explicitly authored the attribute.
  if (item instanceof HTMLLIElement && !item.hasAttribute('value')) {
    return item.dataset['value'] ?? (prop !== 0 ? prop : undefined);
  }
  return prop !== undefined ? prop : item.dataset['value'];
}

/**
 * Assign roles, aria and the roving tabindex across the menu's current items.
 * `focused` is the index holding the tab stop; returns the index actually used
 * (moved onto an enabled item when needed).
 */
export function syncDropdownMenu(menu: HTMLElement, focused = 0, mode: DropdownMenuMode = 'menu'): number {
  // Headers and dividers are chrome: role=menu allows only
  // menuitem*/group/separator children.
  const chrome = (selector: string, role: string) =>
    [...menu.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => ownerMenu(el) === menu && !el.hasAttribute('role'))
      .map((el) => el.setAttribute('role', role));
  chrome('.dropdown-header', 'presentation');
  chrome('.dropdown-divider', 'separator');

  const items = dropdownMenuItems(menu);
  // A navigation panel keeps native roles and every link in the tab order.
  if (items.length === 0 || mode === 'navigation') return 0;
  const firstEnabled = items.findIndex((it) => !dropdownItemDisabled(it));
  const stop = items[focused] && !dropdownItemDisabled(items[focused]) ? focused : Math.max(firstEnabled, 0);

  items.map((item, i) => {
    const control = dropdownItemControl(item);
    // The <li> is presentational when a real control carries the role.
    if (control !== item) item.setAttribute('role', 'presentation');
    control.setAttribute('role', 'menuitem');
    const disabled = dropdownItemDisabled(item);
    if (disabled) control.setAttribute('aria-disabled', 'true');
    else control.removeAttribute('aria-disabled');
    control.setAttribute('tabindex', i === stop && !disabled ? '0' : '-1');
    return control;
  });
  return stop;
}

/** The item of THIS menu an event target sits in, if any. */
function itemOf(menu: HTMLElement, target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const item = target.closest<HTMLElement>('.dropdown-item');
  return item && ownerMenu(item) === menu ? item : null;
}

/**
 * `menu`: an APG menu (menuitem roles, one roving tab stop). `navigation`: the
 * APG disclosure-navigation panel a navbar dropdown is: links keep their
 * native role and stay Tab-reachable, and the arrow keys are only a shortcut.
 */
export type DropdownMenuMode = 'menu' | 'navigation';

export interface AttachDropdownMenuOptions {
  /** An enabled item was activated (click, or Enter/Space on a bare item). */
  readonly onSelect?: (detail: DropdownSelectEventDetail) => void;
  /** Defaults to `menu`. */
  readonly mode?: DropdownMenuMode;
}

/**
 * Own the menu behaviour on a rendered `.dropdown-menu`. Re-syncs on every
 * child-list change, so items a front adds or removes later are covered.
 * Returns the disposer.
 */
export function attachDropdownMenu(menu: HTMLElement, options: AttachDropdownMenuOptions = {}): () => void {
  const mode = options.mode ?? 'menu';
  const sync = (index: number) => syncDropdownMenu(menu, index, mode);
  let focused = sync(0);

  const moveTo = (index: number) => {
    const items = dropdownMenuItems(menu);
    if (!items[index]) return;
    focused = mode === 'menu' ? sync(index) : index;
    dropdownItemControl(items[focused]).focus();
  };

  const onFocusIn = (event: FocusEvent) => {
    const item = itemOf(menu, event.target);
    if (!item || dropdownItemDisabled(item)) return;
    const index = dropdownMenuItems(menu).indexOf(item);
    if (index !== focused) focused = mode === 'menu' ? sync(index) : index;
  };

  const onKeydown = (event: KeyboardEvent) => {
    const item = itemOf(menu, event.target);
    if (!item) return;
    const items = dropdownMenuItems(menu);
    const target = rovingTarget(
      event.key,
      {
        count: items.length,
        from: items.indexOf(item),
        wrap: true,
        isDisabled: (i) => dropdownItemDisabled(items[i]),
      },
      event,
    );
    if (target !== null) {
      event.preventDefault();
      moveTo(target);
      return;
    }
    if (mode === 'navigation' || (event.key !== 'Enter' && event.key !== ' ')) return;
    if (dropdownItemDisabled(item)) return;
    /* A bare `<li class="dropdown-item">` IS the menuitem, and a plain element
       has no native activation. Synthesize the click, but only where the UA
       would not: Enter self-activates a <button>, an <a href> or a <summary>,
       Space a <button> or a <summary>. Synthesizing there too would double-fire. */
    const control = dropdownItemControl(item);
    const native =
      control instanceof HTMLButtonElement ||
      control.localName === 'summary' ||
      (event.key === 'Enter' && control instanceof HTMLAnchorElement && control.hasAttribute('href'));
    if (native) return;
    // Space must not scroll the page; Enter must not submit an outer form.
    event.preventDefault();
    control.click();
  };

  const onClick = (event: MouseEvent) => {
    const item = itemOf(menu, event.target);
    if (!item || dropdownItemDisabled(item)) return;
    // A submenu trigger opens its submenu; it is not a selection.
    if (dropdownItemControl(item).localName === 'summary') return;
    options.onSelect?.({ item, value: dropdownItemValue(item) });
  };

  const observer = new MutationObserver(() => {
    focused = sync(focused);
  });
  // Only `class` (an item turning .disabled): the sync itself writes role,
  // tabindex and aria-disabled, and observing those would loop.
  observer.observe(menu, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  menu.addEventListener('focusin', onFocusIn);
  menu.addEventListener('keydown', onKeydown);
  menu.addEventListener('click', onClick);
  return () => {
    observer.disconnect();
    menu.removeEventListener('focusin', onFocusIn);
    menu.removeEventListener('keydown', onKeydown);
    menu.removeEventListener('click', onClick);
  };
}
