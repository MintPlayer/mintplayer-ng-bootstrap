import { defineCore, type CoreApi, type CoreBag } from '@mintplayer/ui-core/component';
import {
  anchorSide,
  isKept,
  isRendered,
  isShown,
  OverlayPresence,
  phaseBag,
  phaseState,
  placeBeside,
  trackBeside,
  type AnchorSide,
  type OverlayPhase,
  type PresenceState,
} from '@mintplayer/ui-core/overlay';

/**
 * Bootstrap's tooltip (#458 M6): a directive on the trigger, and a panel the
 * front renders into a body host while it shows.
 *
 *   <button aria-describedby=<tip>>…</button>          (the consumer's element; the directive)
 *   <div data-mp-overlay>                               (end of <body>, from the first show; hidden while closed)
 *     <div class="tooltip bs-tooltip-<side> fade [show]" role="tooltip" id=<tip>>
 *       <div class="tooltip-arrow"></div>
 *       <div class="tooltip-inner">…the content…</div>
 *
 * WCAG 1.4.13: it shows on hover AND on focus; the pointer may travel into it
 * (a short hide delay that entering it cancels); Escape dismisses it without
 * moving focus. It sits on `position`, flipped to the opposite side when it
 * does not fit. While it shows, the trigger's `aria-describedby` names it, next
 * to any description the trigger already had.
 *
 * No-JS tier 2: nothing shows without JavaScript; the trigger is untouched.
 */
export interface TooltipInputs {
  /** The side of the trigger it shows on. */
  position: AnchorSide;
}

export interface TooltipState extends PresenceState {
  /** The side it landed on (the opposite of `position` when that did not fit). */
  side: AnchorSide;
  /** The trigger's own `aria-describedby`, read when the directive attached. */
  describedBy: string | null;
}

/** The panel's inputs: what the directive hands the `tooltip-panel` component. */
export interface TooltipPanelInputs {
  /** The panel's id, which the trigger's `aria-describedby` names. */
  overlayId: string;
  side: AnchorSide;
  /** The overlay phase: `.show` while `shown`, `hidden` while `closed` (#465). */
  phase: OverlayPhase;
}

export interface TooltipProps {
  /** The trigger's bag. */
  readonly anchor: CoreBag;
  /** The panel's inputs from its first show on (kept while closed, #465); null before. */
  readonly overlay: TooltipPanelInputs | null;
}

export interface TooltipPanelView {
  readonly root: CoreBag;
  readonly arrow: CoreBag;
  readonly inner: CoreBag;
}

/** The trigger names its panel's id here, so the core finds the body-hosted panel. */
export const TOOLTIP_OF_ATTR = 'data-mp-tooltip';

/** How long the pointer may travel from the trigger into the tooltip before it hides. */
export const TOOLTIP_HIDE_DELAY_MS = 150;

/** The gap between the trigger and the panel: Bootstrap's arrow height. */
const GAP = 6;

const tokens = (...lists: (string | null)[]) => lists.flatMap((list) => (list ?? '').split(/\s+/)).filter(Boolean);

export function connectTooltip(inputs: TooltipInputs, state: TooltipState, id: string): TooltipProps {
  const overlayId = `${id}-tooltip`;
  const rendered = isRendered(state.phase);
  const own = tokens(state.describedBy).filter((token) => token !== overlayId);
  const describedBy = rendered ? [...own, overlayId] : own;
  return {
    anchor: { 'aria-describedby': describedBy.length ? describedBy.join(' ') : null, [TOOLTIP_OF_ATTR]: overlayId },
    overlay: isKept(state) ? { overlayId, side: state.side, phase: state.phase } : null,
  };
}

export function connectTooltipPanel(inputs: TooltipPanelInputs): TooltipPanelView {
  const side = anchorSide(inputs.side, 'top');
  const phase = inputs.phase ?? 'closed';
  return {
    root: { ...phaseBag(phase), class: `tooltip bs-tooltip-${side} fade${isShown(phase) ? ' show' : ''}`, role: 'tooltip', id: inputs.overlayId || null },
    arrow: { class: 'tooltip-arrow' },
    inner: { class: 'tooltip-inner' },
  };
}

type Api = CoreApi<TooltipInputs, TooltipState, Record<never, never>>;

export const tooltipCore = defineCore<TooltipInputs, TooltipState, TooltipProps>({
  state: (inputs) => ({ phase: 'closed', kept: false, side: anchorSide(inputs.position, 'top'), describedBy: null }),
  view: ({ inputs, state, id }) => connectTooltip(inputs, state, id),
  attach: (api: Api) => {
    const host = api.host;
    const doc = host.ownerDocument;
    const view = doc.defaultView;
    api.setState({ describedBy: host.getAttribute('aria-describedby') });
    const find = () => {
      const id = host.getAttribute(TOOLTIP_OF_ATTR);
      return id ? doc.getElementById(id) : null;
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const cancelHide = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const show = () => {
      cancelHide();
      presence.set(true);
    };
    const hide = () => {
      cancelHide();
      presence.set(false);
    };
    const scheduleHide = () => {
      cancelHide();
      timer = setTimeout(hide, TOOLTIP_HIDE_DELAY_MS);
    };

    const place = (panel: HTMLElement) => {
      const side = placeBeside(host, panel, anchorSide(api.inputs().position, 'top'), GAP);
      if (side !== api.state().side) api.setState({ side });
    };
    const presence = new OverlayPresence({
      doc,
      find,
      setPhase: (phase) => api.setState(phaseState(phase)),
      // Escape hides it and leaves focus where it is (1.4.13 "dismissible").
      overlay: () => ({ onDismiss: (reason) => reason === 'escape' && hide() }),
      wire: (panel) => {
        place(panel);
        const untrack = trackBeside(panel, () => place(panel));
        // 1.4.13 "hoverable": entering the panel keeps it, leaving it hides it.
        panel.addEventListener('mouseenter', cancelHide);
        panel.addEventListener('mouseleave', scheduleHide);
        return () => {
          untrack();
          panel.removeEventListener('mouseenter', cancelHide);
          panel.removeEventListener('mouseleave', scheduleHide);
        };
      },
    });

    const listeners: [EventTarget | null, string, () => void][] = [
      [host, 'mouseenter', show],
      [host, 'mouseleave', scheduleHide],
      [host, 'focusin', show],
      [host, 'focusout', hide],
      [view, 'blur', hide],
    ];
    listeners.map(([target, type, fn]) => target?.addEventListener(type, fn));
    return () => {
      listeners.map(([target, type, fn]) => target?.removeEventListener(type, fn));
      cancelHide();
      presence.dispose();
    };
  },
});

/** The panel: a pure view of the inputs the directive hands it. */
export const tooltipPanelCore = defineCore<TooltipPanelInputs, Record<string, never>, { view: TooltipPanelView }>({
  view: ({ inputs }) => ({ view: connectTooltipPanel(inputs) }),
});
