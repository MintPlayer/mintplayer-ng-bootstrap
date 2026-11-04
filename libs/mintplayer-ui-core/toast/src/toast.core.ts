import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { announceToPage, type Politeness } from '@mintplayer/ui-core/announce';
import type { ToastEntry, ToastSource } from './toast-queue';

/**
 * Bootstrap's toast (#458 M6), as four components of one group:
 *
 *   <toaster [queue]>                  div.toast-container.position-fixed.p-3 (+ placement utilities)
 *     <toast [visible]>                div.toast.fade[.show[.showing]]
 *       <toast-header (dismiss)>       div.toast-header … <button.btn-close aria-label>
 *       <toast-body>                   div.toast-body
 *
 * The toast follows Bootstrap's own phases: hidden (`display: none`), then
 * `.show.showing` for one frame and `.show` once in, and `.show.showing` again
 * while it fades out. Turning visible announces its text through a page-level
 * live region (`politeness`): the toast's own node is hidden until then, and a
 * region mounted together with its text is the pattern screen readers miss.
 *
 * The toaster renders a `ToastQueue` (`toast-queue.ts`): one `toast` slot per
 * entry, and it holds the queue's autohide timers while the pointer or focus
 * is inside it.
 *
 * No-JS tier 2: a toast that is visible on the server renders shown; the
 * header's close button is `hidden` until hydrated.
 */
export type ToastPhase = 'hidden' | 'entering' | 'shown' | 'leaving';

export interface ToastInputs {
  /** Whether it shows. Two-way. */
  visible: boolean;
  /** How its text is announced when it shows. */
  politeness: Politeness;
}

export interface ToastHeaderInputs {
  /** Render the close button. */
  dismissible: boolean;
  /** The close button's accessible name. Override for localisation. */
  closeLabel: string;
}

export type ToastPlacement = 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

export interface ToasterInputs {
  queue: ToastSource | null;
  placement: ToastPlacement;
}

export interface ToasterView {
  readonly root: CoreBag;
  readonly toasts: readonly ToastEntry<unknown>[];
}

/** Bootstrap's toast fade, 0.15s, plus a margin. */
export const TOAST_FADE_MS = 180;
export const TOAST_DISMISS_ATTR = 'data-toast-dismiss';

export function toastClasses(phase: ToastPhase): string {
  switch (phase) {
    case 'hidden':
      return 'toast fade';
    case 'shown':
      return 'toast fade show';
    default:
      return 'toast fade show showing';
  }
}

export function connectToast(phase: ToastPhase): CoreBag {
  return { class: toastClasses(phase), 'aria-atomic': 'true' };
}

export function connectToastHeader(inputs: ToastHeaderInputs, hydrated: boolean): { root: CoreBag; close: CoreBag | null } {
  return {
    root: { class: 'toast-header' },
    close: inputs.dismissible
      ? { class: 'btn-close', type: 'button', 'aria-label': inputs.closeLabel, [TOAST_DISMISS_ATTR]: '', hidden: hydrated ? null : '' }
      : null,
  };
}

const PLACEMENTS: Record<ToastPlacement, string> = {
  'top-start': 'top-0 start-0',
  'top-center': 'top-0 start-50 translate-middle-x',
  'top-end': 'top-0 end-0',
  'bottom-start': 'bottom-0 start-0',
  'bottom-center': 'bottom-0 start-50 translate-middle-x',
  'bottom-end': 'bottom-0 end-0',
};

export function connectToaster(inputs: ToasterInputs, toasts: readonly ToastEntry<unknown>[]): ToasterView {
  const placement = PLACEMENTS[inputs.placement] ?? PLACEMENTS['bottom-end'];
  return { root: { class: `toast-container position-fixed p-3 ${placement}` }, toasts };
}

export const toastCore = defineCore<ToastInputs, { visible: boolean; phase: ToastPhase }, { root: CoreBag }, { visibleChange: boolean }>({
  state: (inputs) => ({ visible: !!inputs.visible, phase: inputs.visible ? 'shown' : 'hidden' }),
  view: ({ state }) => ({ root: connectToast(state.phase) }),
  attach: (api) => {
    const view = api.host.ownerDocument.defaultView;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const settle = (visible: boolean) => {
      clearTimeout(timer);
      if (frame) view?.cancelAnimationFrame(frame);
      if (visible) {
        api.setState({ phase: 'entering' });
        // Two frames: the browser must paint `.showing` (opacity 0) before it fades in.
        frame = view?.requestAnimationFrame(() => (frame = view.requestAnimationFrame(() => ((frame = 0), api.setState({ phase: 'shown' }))))) ?? 0;
        queueMicrotask(() => announceToPage(api.host.ownerDocument, api.host.textContent ?? '', api.inputs().politeness));
      } else {
        api.setState({ phase: 'leaving' });
        timer = setTimeout(() => api.setState({ phase: 'hidden' }), TOAST_FADE_MS);
      }
    };
    // The header's close button sits in the consumer's content: one delegated listener.
    const onClick = (event: Event) => {
      const button = (event.target as Element | null)?.closest?.(`[${TOAST_DISMISS_ATTR}]`);
      if (!button || !api.host.contains(button)) return;
      settle(false);
      api.setState({ visible: false });
    };
    api.host.addEventListener('click', onClick);
    toastSettlers.set(api.host, settle);
    return () => {
      clearTimeout(timer);
      if (frame) view?.cancelAnimationFrame(frame);
      api.host.removeEventListener('click', onClick);
      toastSettlers.delete(api.host);
    };
  },
  inputsChanged: (api, prev) => {
    const visible = !!api.inputs().visible;
    if (visible === !!prev.visible || visible === (api.state().phase !== 'hidden' && api.state().phase !== 'leaving')) return;
    api.setState({ visible });
    toastSettlers.get(api.host)?.(visible);
  },
});

const toastSettlers = new WeakMap<HTMLElement, (visible: boolean) => void>();

export const toastHeaderCore = defineCore<ToastHeaderInputs, Record<string, never>, { root: CoreBag; close: CoreBag | null }>({
  view: ({ inputs, hydrated }) => connectToastHeader(inputs, hydrated),
});

export const toastBodyCore = defineCore<Record<string, never>, Record<string, never>, { root: CoreBag }>({
  view: () => ({ root: { class: 'toast-body' } }),
});

const toasterBindings = new WeakMap<HTMLElement, (queue: ToastSource | null) => void>();

export const toasterCore = defineCore<ToasterInputs, { toasts: readonly ToastEntry<unknown>[] }, { view: ToasterView }>({
  state: (inputs) => ({ toasts: inputs.queue?.toasts ?? [] }),
  view: ({ inputs, state }) => ({ view: connectToaster(inputs, state.toasts) }),
  attach: (api) => {
    const host = api.host;
    let unsubscribe = () => undefined as void;
    let queue: ToastSource | null = null;
    const bind = (next: ToastSource | null) => {
      unsubscribe();
      queue?.release();
      queue = next;
      api.setState({ toasts: next?.toasts ?? [] });
      unsubscribe = next ? next.subscribe((s) => api.setState({ toasts: s.toasts })) : () => undefined;
    };
    // Autohide pauses while the user points at or reads a toast (WCAG 2.2.1).
    const hold = () => queue?.hold();
    const release = (event: Event) => {
      const next = (event as FocusEvent).relatedTarget as Node | null;
      if (event.type === 'focusout' && next && host.contains(next)) return;
      if (event.type === 'focusout' ? host.matches(':hover') : host.contains(host.ownerDocument.activeElement)) return;
      queue?.release();
    };
    const events = [
      ['pointerenter', hold],
      ['focusin', hold],
      ['pointerleave', release],
      ['focusout', release],
    ] as const;
    events.map(([name, fn]) => host.addEventListener(name, fn));
    bind(api.inputs().queue);
    toasterBindings.set(host, bind);
    return () => {
      events.map(([name, fn]) => host.removeEventListener(name, fn));
      bind(null);
      toasterBindings.delete(host);
    };
  },
  inputsChanged: (api, prev) => {
    if (api.inputs().queue !== prev.queue) toasterBindings.get(api.host)?.(api.inputs().queue);
  },
});
