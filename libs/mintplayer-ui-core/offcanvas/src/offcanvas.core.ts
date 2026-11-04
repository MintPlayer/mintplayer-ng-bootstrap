import { defineCore, type CoreApi, type CoreBag } from '@mintplayer/ui-core/component';
import { findByAttribute, isRendered, OverlayPresence, type OverlayPhase } from '@mintplayer/ui-core/overlay';

/**
 * Bootstrap's offcanvas (#458 M6): a panel that slides in from a viewport
 * edge, rendered into a body host and opened on the overlay stack.
 *
 *   <div class="offcanvas-host">                     (where it is declared; renders nothing)
 *   <div data-mp-overlay>                            (end of <body>, while rendered)
 *     <div class="offcanvas offcanvas-<position> [show|hiding]" role="dialog" [aria-modal]
 *          aria-labelledby=<title> style="--bs-offcanvas-width|height: <size>px">
 *       <div class="offcanvas-header"><h2 class="offcanvas-title h5" id=<title>>…header slot…</h2>
 *         <button class="btn-close" data-bs-dismiss="offcanvas" aria-label=<closeLabel>></div>
 *       <div class="offcanvas-body">…content…</div>
 *     <div class="offcanvas-backdrop fade [show]">   (with `backdrop`)
 *
 * With a backdrop it is a modal dialog (focus trapped, the page `inert`
 * behind it); without one it is a non-modal panel the page stays usable
 * around. Escape closes it either way; a backdrop click closes it unless
 * `closeOnBackdrop` is off. Any element inside with
 * `data-bs-dismiss="offcanvas"` closes it. `open` is two-way.
 *
 * No-JS tier 2: an offcanvas open at load server-renders (Angular), but none
 * can be opened or closed without JavaScript.
 */
export type OffcanvasPosition = 'start' | 'end' | 'top' | 'bottom';

export interface OffcanvasInputs {
  /** Whether the panel is open. Two-way. */
  open: boolean;
  /** The viewport edge it slides in from. */
  position: OffcanvasPosition;
  /** The panel's width (start/end) or height (top/bottom) in px; null keeps Bootstrap's. */
  size: number | null;
  /** Dim the page behind it and make the panel modal. */
  backdrop: boolean;
  /** A click on the backdrop closes it. */
  closeOnBackdrop: boolean;
  /** Escape closes it. */
  closeOnEscape: boolean;
  /** Render the header's close button. */
  closeButton: boolean;
  /** The close button's accessible name. Override for localisation. */
  closeLabel: string;
  /** Drop the body's padding (edge-to-edge content such as a menu). */
  noPadding: boolean;
}

export interface OffcanvasState {
  open: boolean;
  phase: OverlayPhase;
}

export interface OffcanvasView {
  readonly root: CoreBag;
  readonly rendered: boolean;
  readonly panel: CoreBag;
  /** The size, as Bootstrap's own custom property on the panel. */
  readonly panelStyle: Record<string, string>;
  readonly header: CoreBag;
  readonly title: CoreBag;
  readonly close: CoreBag | null;
  readonly body: CoreBag;
  /** The backdrop; null without `backdrop`. */
  readonly backdrop: CoreBag | null;
}

export const OFFCANVAS_ROOT_ATTR = 'data-offcanvas-root';
export const OFFCANVAS_OF_ATTR = 'data-offcanvas-of';
export const OFFCANVAS_DISMISS_SELECTOR = '[data-bs-dismiss="offcanvas"]';

const POSITIONS: readonly OffcanvasPosition[] = ['start', 'end', 'top', 'bottom'];

const positionOf = (value: string): OffcanvasPosition => (POSITIONS.includes(value as OffcanvasPosition) ? (value as OffcanvasPosition) : 'start');

/** Bootstrap 5.3's classes per phase: `.show` slides it in, `.hiding` keeps it visible while it slides out. */
function phaseClass(phase: OverlayPhase): string | null {
  return phase === 'shown' ? 'show' : phase === 'leaving' ? 'hiding' : null;
}

export function connectOffcanvas(inputs: OffcanvasInputs, phase: OverlayPhase, id: string, label: string | null): OffcanvasView {
  const position = positionOf(inputs.position);
  const titleId = `${id}-title`;
  const horizontal = position === 'start' || position === 'end';
  const size = typeof inputs.size === 'number' && inputs.size > 0 ? `${inputs.size}px` : null;
  return {
    root: { class: 'offcanvas-host', [OFFCANVAS_ROOT_ATTR]: id },
    rendered: isRendered(phase),
    panel: {
      class: ['offcanvas', `offcanvas-${position}`, phaseClass(phase)].filter(Boolean).join(' '),
      role: 'dialog',
      'aria-modal': inputs.backdrop ? 'true' : null,
      tabindex: -1,
      'aria-labelledby': label ? null : titleId,
      'aria-label': label,
      [OFFCANVAS_OF_ATTR]: id,
    },
    panelStyle: size ? { [horizontal ? '--bs-offcanvas-width' : '--bs-offcanvas-height']: size } : {},
    header: { class: 'offcanvas-header' },
    title: { class: 'offcanvas-title h5', id: titleId },
    close: inputs.closeButton ? { class: 'btn-close', type: 'button', 'aria-label': inputs.closeLabel, 'data-bs-dismiss': 'offcanvas' } : null,
    body: { class: inputs.noPadding ? 'offcanvas-body p-0' : 'offcanvas-body' },
    backdrop: inputs.backdrop ? { class: `offcanvas-backdrop fade${phase === 'shown' ? ' show' : ''}`, 'aria-hidden': 'true' } : null,
  };
}

type Api = CoreApi<OffcanvasInputs, OffcanvasState, { openChange: boolean }>;

const presences = new WeakMap<HTMLElement, OverlayPresence>();

function close(api: Api): void {
  if (!api.state().open) return;
  api.setState({ open: false });
  presences.get(api.host)?.set(false);
}

/** The backdrop rendered beside `panel` in its body host. */
const backdropOf = (panel: HTMLElement): HTMLElement | null =>
  (Array.from(panel.parentElement?.children ?? []).find((el) => el.classList.contains('offcanvas-backdrop')) as HTMLElement | undefined) ?? null;

export const offcanvasCore = defineCore<OffcanvasInputs, OffcanvasState, { view: OffcanvasView }, { openChange: boolean }>({
  state: (inputs) => ({ open: !!inputs.open, phase: inputs.open ? 'shown' : 'closed' }),
  view: ({ inputs, state, id, label }) => ({ view: connectOffcanvas(inputs, state.phase, id, label) }),
  attach: (api) => {
    const doc = api.host.ownerDocument;
    const presence = new OverlayPresence(
      {
        doc,
        find: () => findByAttribute(doc, OFFCANVAS_OF_ATTR, api.host.getAttribute(OFFCANVAS_ROOT_ATTR)),
        setPhase: (phase) => api.setState({ phase }),
        overlay: () => ({
          modal: !!api.inputs().backdrop,
          onDismiss: (reason) => {
            if (reason === 'escape' && api.inputs().closeOnEscape) close(api);
          },
        }),
        wire: (panel) => {
          const backdrop = backdropOf(panel);
          const onPanelClick = (event: MouseEvent) => {
            if ((event.target as Element | null)?.closest?.(OFFCANVAS_DISMISS_SELECTOR)) close(api);
          };
          const onBackdropClick = () => {
            if (api.inputs().closeOnBackdrop) close(api);
          };
          panel.addEventListener('click', onPanelClick);
          backdrop?.addEventListener('click', onBackdropClick);
          return () => {
            panel.removeEventListener('click', onPanelClick);
            backdrop?.removeEventListener('click', onBackdropClick);
          };
        },
        transitioning: (panel) => [panel, backdropOf(panel)].filter((el): el is HTMLElement => !!el),
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
