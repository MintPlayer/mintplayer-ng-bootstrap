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
 * Bootstrap's popover (#458 M6): a directive on the trigger, and a non-modal
 * dialog the front renders into a body host while it is open.
 *
 *   <button aria-haspopup="dialog" aria-expanded aria-controls=<pop>>…</button>   (the consumer's element)
 *   <div data-mp-overlay>                                                         (end of <body>, from the first open; hidden while closed)
 *     <div class="popover bs-popover-<side> fade [show]" role="dialog" tabindex="-1" id=<pop> aria-labelledby=<title>>
 *       <div class="popover-arrow"></div>
 *       <h3 class="popover-header" id=<title>>…title…</h3>
 *       <div class="popover-body">…the content…</div>
 *
 * A click on the trigger toggles it (Enter and Space too, on a trigger that is
 * not natively focusable, which then becomes a focusable button). Opening moves
 * focus into the dialog; Escape closes it and returns focus to the trigger; a
 * press outside it, or focus leaving both it and the trigger, closes it. It sits
 * on `position`, flipped to the opposite side when it does not fit. The title
 * names the dialog; without one, the trigger does (`aria-labelledby`).
 *
 * No-JS tier 2: the trigger renders `aria-expanded="false"`; nothing opens
 * without JavaScript.
 */
export interface PopoverInputs {
  /** The side of the trigger it shows on. */
  position: AnchorSide;
  /** The heading; it names the dialog. */
  title: string | null;
}

export interface PopoverState extends PresenceState {
  /** The side it landed on (the opposite of `position` when that did not fit). */
  side: AnchorSide;
  /** The trigger is not natively focusable: the core makes it a focusable button. */
  promote: boolean;
  /** The trigger's id (given one when it had none), naming the dialog when there is no title. */
  triggerId: string | null;
}

/** The panel's inputs: what the directive hands the `popover-panel` component. */
export interface PopoverPanelInputs {
  /** The panel's id, which the trigger's `aria-controls` names. */
  overlayId: string;
  side: AnchorSide;
  /** The overlay phase: `.show` while `shown`, `hidden` while `closed` (#465). */
  phase: OverlayPhase;
  /** The heading (the directive's `title`). */
  heading: string | null;
  /** The trigger's id, naming the dialog when there is no title. */
  triggerId: string | null;
}

export interface PopoverProps {
  /** The trigger's bag. */
  readonly anchor: CoreBag;
  /** The panel's inputs from its first open on (kept while closed, #465); null before. */
  readonly overlay: PopoverPanelInputs | null;
}

export interface PopoverPanelView {
  readonly root: CoreBag;
  readonly arrow: CoreBag;
  /** The heading; null without a title. */
  readonly header: CoreBag | null;
  readonly title: string;
  readonly body: CoreBag;
}

/** The trigger names its panel's id here, so the core finds the body-hosted panel. */
export const POPOVER_OF_ATTR = 'data-mp-popover';

/** The gap between the trigger and the panel: Bootstrap's arrow height. */
const GAP = 8;

const NATIVELY_FOCUSABLE = 'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable]';

export function connectPopover(inputs: PopoverInputs, state: PopoverState, id: string): PopoverProps {
  const overlayId = `${id}-popover`;
  const rendered = isRendered(state.phase);
  return {
    anchor: {
      'aria-haspopup': 'dialog',
      'aria-expanded': rendered ? 'true' : 'false',
      'aria-controls': rendered ? overlayId : null,
      [POPOVER_OF_ATTR]: overlayId,
      role: state.promote ? 'button' : null,
      tabindex: state.promote ? 0 : null,
    },
    overlay: isKept(state)
      ? { overlayId, side: state.side, phase: state.phase, heading: inputs.title || null, triggerId: inputs.title ? null : state.triggerId }
      : null,
  };
}

export function connectPopoverPanel(inputs: PopoverPanelInputs): PopoverPanelView {
  const side = anchorSide(inputs.side, 'bottom');
  const titleId = `${inputs.overlayId}-title`;
  const phase = inputs.phase ?? 'closed';
  return {
    root: {
      ...phaseBag(phase),
      class: `popover bs-popover-${side} fade${isShown(phase) ? ' show' : ''}`,
      role: 'dialog',
      tabindex: -1,
      id: inputs.overlayId || null,
      'aria-labelledby': inputs.heading ? titleId : inputs.triggerId,
    },
    arrow: { class: 'popover-arrow' },
    header: inputs.heading ? { class: 'popover-header', id: titleId } : null,
    title: inputs.heading ?? '',
    body: { class: 'popover-body' },
  };
}

type Api = CoreApi<PopoverInputs, PopoverState, Record<never, never>>;

export const popoverCore = defineCore<PopoverInputs, PopoverState, PopoverProps>({
  state: (inputs) => ({ phase: 'closed', kept: false, side: anchorSide(inputs.position, 'bottom'), promote: false, triggerId: null }),
  view: ({ inputs, state, id }) => connectPopover(inputs, state, id),
  attach: (api: Api) => {
    const host = api.host;
    const doc = host.ownerDocument;
    // The trigger names the dialog when there is no title: it needs an id.
    if (!host.id) host.id = `${host.getAttribute(POPOVER_OF_ATTR)?.replace(/-popover$/, '') ?? 'mp-popover'}-trigger`;
    api.setState({ promote: !host.matches(NATIVELY_FOCUSABLE), triggerId: host.id });
    const find = () => {
      const id = host.getAttribute(POPOVER_OF_ATTR);
      return id ? doc.getElementById(id) : null;
    };
    let open = false;
    const set = (next: boolean, refocus = false) => {
      if (next === open) return;
      open = next;
      presence.set(next);
      if (!next && refocus) host.focus();
    };

    const place = (panel: HTMLElement) => {
      const side = placeBeside(host, panel, anchorSide(api.inputs().position, 'bottom'), GAP);
      if (side !== api.state().side) api.setState({ side });
    };
    const presence = new OverlayPresence({
      doc,
      find,
      setPhase: (phase) => api.setState(phaseState(phase)),
      overlay: () => ({
        inside: () => [host],
        onDismiss: (reason) => set(false, reason === 'escape'),
      }),
      wire: (panel) => {
        place(panel);
        const untrack = trackBeside(panel, () => place(panel));
        panel.focus({ preventScroll: true });
        // Focus leaving both the dialog and its trigger (Tab past its last control) closes it.
        const onFocusOut = (event: FocusEvent) => {
          const next = event.relatedTarget as Node | null;
          if (next && !panel.contains(next) && !host.contains(next)) set(false);
        };
        panel.addEventListener('focusout', onFocusOut);
        return () => {
          untrack();
          panel.removeEventListener('focusout', onFocusOut);
        };
      },
    });

    const onClick = () => set(!open);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!api.state().promote || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      set(!open);
    };
    host.addEventListener('click', onClick);
    host.addEventListener('keydown', onKeyDown);
    return () => {
      host.removeEventListener('click', onClick);
      host.removeEventListener('keydown', onKeyDown);
      presence.dispose();
    };
  },
});

/** The panel: a pure view of the inputs the directive hands it. */
export const popoverPanelCore = defineCore<PopoverPanelInputs, Record<string, never>, { view: PopoverPanelView }>({
  view: ({ inputs }) => ({ view: connectPopoverPanel(inputs) }),
});
