import { defineCore, type CoreApi, type CoreBag } from '@mintplayer/ui-core/component';
import { findByAttribute, isRendered, isShown, OverlayPresence, type OverlayPhase } from '@mintplayer/ui-core/overlay';

/**
 * Bootstrap's modal dialog (#458 M6), rendered into a body host so no
 * `overflow: hidden` ancestor clips it, and opened on the overlay stack
 * (z-order, focus trap and return, `inert` behind it, Escape).
 *
 *   <div class="modal-host">                       (where it is declared; renders nothing)
 *   <div data-mp-overlay>                          (end of <body>, while rendered)
 *     <div class="modal fade [show]" role="dialog" aria-modal="true" aria-labelledby=<title>>
 *       <div class="modal-dialog [modal-dialog-scrollable] [modal-dialog-centered] [modal-<size>]">
 *         <div class="modal-content">
 *           <div class="modal-header"><h2 class="modal-title h5" id=<title>>…header slot…</h2>
 *             <button class="btn-close" data-bs-dismiss="modal" aria-label=<closeLabel>></div>
 *           <div class="modal-body">…content…</div>
 *           <div class="modal-footer">…footer slot…</div>
 *     <div class="modal-backdrop fade [show]">
 *
 * The header slot is the dialog's name (`aria-labelledby`); without one, name
 * it with `label`. Any element inside with `data-bs-dismiss="modal"` closes it,
 * as in Bootstrap. `open` is two-way.
 *
 * No-JS tier 2: a modal open at load server-renders (Angular), but nothing can
 * open or close one without JavaScript.
 */
export type ModalSize = 'sm' | 'lg' | 'xl';

export interface ModalInputs {
  /** Whether the dialog is open. Two-way. */
  open: boolean;
  /** Scroll the body inside the dialog instead of the page. */
  scrollable: boolean;
  /** Centre the dialog vertically. */
  centered: boolean;
  size: ModalSize | null;
  /** Escape closes it. */
  closeOnEscape: boolean;
  /** A click on the backdrop closes it. */
  closeOnBackdrop: boolean;
  /** Render the header's close button. */
  closeButton: boolean;
  /** The close button's accessible name. Override for localisation. */
  closeLabel: string;
}

export interface ModalState {
  open: boolean;
  phase: OverlayPhase;
}

export interface ModalView {
  readonly root: CoreBag;
  /** Whether the overlay's markup renders (open, or still transitioning out). */
  readonly rendered: boolean;
  readonly modal: CoreBag;
  readonly dialog: CoreBag;
  readonly content: CoreBag;
  readonly header: CoreBag;
  readonly title: CoreBag;
  /** The header's close button; null without `closeButton`. */
  readonly close: CoreBag | null;
  readonly body: CoreBag;
  readonly footer: CoreBag;
  readonly backdrop: CoreBag;
}

/** The modal's own markers: the root names the id, the dialog carries it, so the core finds its body-hosted markup. */
export const MODAL_ROOT_ATTR = 'data-modal-root';
export const MODAL_OF_ATTR = 'data-modal-of';
export const MODAL_DISMISS_SELECTOR = '[data-bs-dismiss="modal"]';

const SIZES: readonly string[] = ['sm', 'lg', 'xl'];

export function connectModal(inputs: ModalInputs, phase: OverlayPhase, id: string, label: string | null): ModalView {
  const show = isShown(phase) ? ' show' : '';
  const titleId = `${id}-title`;
  return {
    root: { class: 'modal-host', [MODAL_ROOT_ATTR]: id },
    rendered: isRendered(phase),
    modal: {
      class: `modal fade${show}`,
      role: 'dialog',
      'aria-modal': 'true',
      tabindex: -1,
      'aria-labelledby': label ? null : titleId,
      'aria-label': label,
      [MODAL_OF_ATTR]: id,
    },
    dialog: {
      class: [
        'modal-dialog',
        inputs.scrollable ? 'modal-dialog-scrollable' : null,
        inputs.centered ? 'modal-dialog-centered' : null,
        inputs.size && SIZES.includes(inputs.size) ? `modal-${inputs.size}` : null,
      ]
        .filter(Boolean)
        .join(' '),
    },
    content: { class: 'modal-content' },
    header: { class: 'modal-header' },
    title: { class: 'modal-title h5', id: titleId },
    close: inputs.closeButton ? { class: 'btn-close', type: 'button', 'aria-label': inputs.closeLabel, 'data-bs-dismiss': 'modal' } : null,
    body: { class: 'modal-body' },
    footer: { class: 'modal-footer' },
    backdrop: { class: `modal-backdrop fade${show}`, 'aria-hidden': 'true' },
  };
}

type Api = CoreApi<ModalInputs, ModalState, { openChange: boolean }>;

const presences = new WeakMap<HTMLElement, OverlayPresence>();

/** Close from inside (Escape, backdrop, a dismiss button): write the model back and report it. */
function close(api: Api): void {
  if (!api.state().open) return;
  api.setState({ open: false });
  api.emit('openChange', false);
  presences.get(api.host)?.set(false);
}

export const modalCore = defineCore<ModalInputs, ModalState, { view: ModalView }, { openChange: boolean }>({
  state: (inputs) => ({ open: !!inputs.open, phase: inputs.open ? 'shown' : 'closed' }),
  view: ({ inputs, state, id, label }) => ({ view: connectModal(inputs, state.phase, id, label) }),
  attach: (api) => {
    const doc = api.host.ownerDocument;
    const find = () => findByAttribute(doc, MODAL_OF_ATTR, api.host.getAttribute(MODAL_ROOT_ATTR));
    const presence = new OverlayPresence(
      {
        doc,
        find,
        setPhase: (phase) => api.setState({ phase }),
        overlay: () => ({
          modal: true,
          onDismiss: (reason) => {
            if (reason === 'escape' && api.inputs().closeOnEscape) close(api);
          },
        }),
        wire: (modal) => {
          // A press that starts in the dialog and ends on the backdrop (a text selection) is no backdrop click.
          let downOnBackdrop = false;
          const onPointerDown = (event: PointerEvent) => (downOnBackdrop = event.target === modal);
          const onClick = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (target?.closest?.(MODAL_DISMISS_SELECTOR) && modal.contains(target)) return close(api);
            if (target === modal && downOnBackdrop && api.inputs().closeOnBackdrop) close(api);
          };
          modal.addEventListener('pointerdown', onPointerDown);
          modal.addEventListener('click', onClick);
          return () => {
            modal.removeEventListener('pointerdown', onPointerDown);
            modal.removeEventListener('click', onClick);
          };
        },
        transitioning: (modal) => [modal, ...Array.from(doc.querySelectorAll('.modal-backdrop')).filter((el) => el.parentElement === modal.parentElement)],
      },
      api.state().phase,
    );
    presences.set(api.host, presence);
    if (api.state().open) presence.set(true);
    return () => {
      presence.dispose();
      presences.delete(api.host);
    };
  },
  inputsChanged: (api, prev) => {
    const open = !!api.inputs().open;
    if (open === !!prev.open) return;
    if (open !== api.state().open) api.setState({ open });
    presences.get(api.host)?.set(open);
  },
});
