import { defineCore, type CoreApi, type CoreBag } from '@mintplayer/ui-core/component';
import { isRendered, isShown, OverlayPresence, placeAtPoint, type OverlayPhase } from '@mintplayer/ui-core/overlay';
import { activatedItem, dropdownItemControl, dropdownItemDisabled, dropdownMenuItems } from '@mintplayer/ui-core/dropdown-menu';

/**
 * A custom context menu (#458 M6): a directive on the element it belongs to,
 * and a panel the front renders into a body host at the pointer.
 *
 *   <div …>                                                 (the consumer's element, [bsContextMenu])
 *   <div data-mp-overlay>                                    (end of <body>, while open)
 *     <div class="context-menu-panel [show]" id=<panel>>
 *       <div class="dropdown-menu show" role=menu aria-label="Context menu">…</div>   (usually a dropdown-menu)
 *
 * A right-click opens it at the pointer instead of the browser's menu, as do
 * Shift+F10 and the ContextMenu key (at the element). Focus moves to the first
 * item; Escape closes it and returns focus, as does activating an item. A press
 * elsewhere, scrolling the page or the window losing focus closes it. A
 * `disabled` directive leaves the browser's own menu alone.
 *
 * No-JS: nothing; the browser's menu stays (the directive adds no markup).
 */
export interface ContextMenuInputs {
  /** The menu's accessible name, when the content does not name it. */
  label: string;
  /** Leave the browser's context menu alone. */
  disabled: boolean;
}

export interface ContextMenuState {
  phase: OverlayPhase;
}

export interface ContextMenuPanelInputs {
  overlayId: string;
  shown: boolean;
}

export interface ContextMenuProps {
  readonly anchor: CoreBag;
  readonly overlay: ContextMenuPanelInputs | null;
}

/** The element names its panel's id here, so the core finds the body-hosted panel. */
export const CONTEXT_MENU_OF_ATTR = 'data-mp-context-menu';

/** A scroll smaller than this (the cancel of a smooth scroll in flight) keeps the menu open. */
const SCROLL_THRESHOLD = 24;

export function connectContextMenu(state: ContextMenuState, id: string): ContextMenuProps {
  const overlayId = `${id}-context-menu`;
  return {
    anchor: { [CONTEXT_MENU_OF_ATTR]: overlayId },
    overlay: isRendered(state.phase) ? { overlayId, shown: isShown(state.phase) } : null,
  };
}

export function connectContextMenuPanel(inputs: ContextMenuPanelInputs): CoreBag {
  // tabindex: focus lands on the panel itself when it holds no item.
  return { class: `context-menu-panel${inputs.shown ? ' show' : ''}`, id: inputs.overlayId || null, tabindex: -1 };
}

type Api = CoreApi<ContextMenuInputs, ContextMenuState, Record<never, never>>;

export const contextMenuCore = defineCore<ContextMenuInputs, ContextMenuState, ContextMenuProps>({
  state: () => ({ phase: 'closed' }),
  view: ({ state, id }) => connectContextMenu(state, id),
  attach: (api: Api) => {
    const host = api.host;
    const doc = host.ownerDocument;
    const view = doc.defaultView;
    const find = () => {
      const id = host.getAttribute(CONTEXT_MENU_OF_ATTR);
      return id ? doc.getElementById(id) : null;
    };

    let open = false;
    let point = { x: 0, y: 0 };
    /** What had focus when it opened: focus goes back there on Escape or a choice. */
    let returnTo: HTMLElement | null = null;
    const set = (next: boolean, refocus = false) => {
      if (next === open) return;
      open = next;
      presence.set(next);
      if (!next && refocus) returnTo?.focus({ preventScroll: true });
    };

    const presence = new OverlayPresence({
      doc,
      find,
      setPhase: (phase) => api.setState({ phase }),
      overlay: () => ({
        inside: () => [],
        onDismiss: (reason) => set(false, reason === 'escape'),
      }),
      wire: (panel) => {
        placeAtPoint(host, panel, point.x, point.y);
        const menu = panel.querySelector<HTMLElement>('.dropdown-menu');
        if (menu && !menu.hasAttribute('aria-label') && !menu.hasAttribute('aria-labelledby')) menu.setAttribute('aria-label', api.inputs().label);
        const first = menu ? dropdownMenuItems(menu).find((item) => !dropdownItemDisabled(item)) : null;
        // preventScroll: a scroll would close the menu in the tick it opened.
        (first ? dropdownItemControl(first) : panel).focus({ preventScroll: true });

        const scrolled = { x: view?.scrollX ?? 0, y: view?.scrollY ?? 0 };
        const onScroll = (event: Event) => {
          if (event.target instanceof Node && panel.contains(event.target)) return;
          const dx = Math.abs((view?.scrollX ?? 0) - scrolled.x);
          const dy = Math.abs((view?.scrollY ?? 0) - scrolled.y);
          if (event.target !== doc || dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) set(false);
        };
        const onBlur = () => set(false);
        const onFocusOut = (event: FocusEvent) => {
          const next = event.relatedTarget as Node | null;
          if (next && !panel.contains(next)) set(false);
        };
        // Choosing an item (a click; the menu turns Enter / Space into one) closes it and returns focus.
        const onClick = (event: Event) => {
          if (activatedItem(panel, event)) set(false, true);
        };
        view?.addEventListener('scroll', onScroll, true);
        view?.addEventListener('blur', onBlur);
        panel.addEventListener('focusout', onFocusOut);
        panel.addEventListener('click', onClick);
        return () => {
          view?.removeEventListener('scroll', onScroll, true);
          view?.removeEventListener('blur', onBlur);
          panel.removeEventListener('focusout', onFocusOut);
          panel.removeEventListener('click', onClick);
        };
      },
    });

    const openAt = (x: number, y: number, event: Event) => {
      if (api.inputs().disabled) return;
      event.preventDefault();
      // A smooth scroll still animating (the one that brought the element into view) would close the
      // menu on its next frame: an instant scroll to where it is cancels it.
      view?.scrollTo({ top: view.scrollY, left: view.scrollX, behavior: 'instant' });
      const active = doc.activeElement;
      returnTo = open ? returnTo : active instanceof HTMLElement && active !== doc.body ? active : host.matches(':focus-within') ? host : null;
      point = { x, y };
      const panel = open ? find() : null;
      if (panel) placeAtPoint(host, panel, x, y);
      set(true);
    };
    const onContextMenu = (event: MouseEvent) => openAt(event.clientX, event.clientY, event);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return;
      const rect = (event.target as Element).getBoundingClientRect();
      openAt(rect.left + rect.width / 2, rect.bottom, event);
    };
    host.addEventListener('contextmenu', onContextMenu);
    host.addEventListener('keydown', onKeyDown);
    return () => {
      host.removeEventListener('contextmenu', onContextMenu);
      host.removeEventListener('keydown', onKeyDown);
      presence.dispose();
    };
  },
});

/** The panel: a pure view of the inputs the directive hands it. */
export const contextMenuPanelCore = defineCore<ContextMenuPanelInputs, Record<string, never>, { root: CoreBag }>({
  view: ({ inputs }) => ({ root: connectContextMenuPanel(inputs) }),
});
