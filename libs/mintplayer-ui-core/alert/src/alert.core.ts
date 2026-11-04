import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { isThemeColor, type ThemeColor } from '@mintplayer/ui-core/color';

/**
 * Bootstrap's alert (#458 M5): a contextual banner, optionally dismissible.
 *
 *   <div class="alert alert-<color> [alert-dismissible]" [role=alert] [hidden]>
 *     …content…
 *     <button class="btn-close" aria-label=<closeLabel> data-alert-dismiss>
 *   </div>
 *
 * `role="alert"` is opt-in (`announce`): most alerts are static banners present
 * at page load, and a forced alert role re-announces them as urgent
 * interruptions on every render. A dismissed alert stays rendered with
 * `hidden`, so `visible` is two-way and showing it again needs no re-render.
 *
 * No-JS tier 2: the alert renders; its close button is `hidden` until
 * hydrated, since it cannot dismiss anything before then.
 */
export interface AlertInputs {
  color: ThemeColor;
  /** Opt in to `role="alert"` for a genuinely dynamic alert. */
  announce: boolean;
  /** Render a close button that hides the alert. */
  dismissible: boolean;
  /** The close button's accessible name. Override for localisation. */
  closeLabel: string;
  /** Whether the alert is shown. Two-way. */
  visible: boolean;
}

export interface AlertView {
  readonly root: CoreBag;
  /** The close button; null unless dismissible. */
  readonly dismiss: CoreBag | null;
}

export const ALERT_DISMISS_ATTR = 'data-alert-dismiss';

export function alertClasses(color: string, dismissible: boolean): string {
  return ['alert', `alert-${isThemeColor(color) ? color : 'primary'}`, dismissible ? 'alert-dismissible' : null].filter(Boolean).join(' ');
}

export function connectAlert(inputs: AlertInputs, visible: boolean, hydrated: boolean): AlertView {
  return {
    root: {
      class: alertClasses(inputs.color, !!inputs.dismissible),
      role: inputs.announce ? 'alert' : null,
      hidden: visible ? null : '',
    },
    dismiss: inputs.dismissible
      ? { class: 'btn-close', type: 'button', 'aria-label': inputs.closeLabel, [ALERT_DISMISS_ATTR]: '', hidden: hydrated ? null : '' }
      : null,
  };
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hiding the alert removes the close button the user just pressed, which drops
 * focus to `<body>`. Re-home it on the next tabbable after the alert (reading
 * order continues), or the previous one at the end of the page.
 */
export function rescueFocus(host: HTMLElement): void {
  const doc = host.ownerDocument;
  if (!host.contains(doc.activeElement)) return;
  const tabbables = [...doc.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => !host.contains(el));
  const after = tabbables.find((el) => host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  (after ?? tabbables[tabbables.length - 1])?.focus();
}

export const alertCore = defineCore<AlertInputs, { visible: boolean }, { view: AlertView }, { visibleChange: boolean }>({
  state: (inputs) => ({ visible: inputs.visible !== false }),
  view: ({ inputs, state, hydrated }) => ({ view: connectAlert(inputs, state.visible, hydrated) }),
  attach: (api) => {
    const onClick = (event: Event) => {
      const button = (event.target as Element | null)?.closest?.(`[${ALERT_DISMISS_ATTR}]`);
      if (!button || button.parentElement !== api.host) return;
      // Order matters: the rescue reads focus while the button is still shown.
      rescueFocus(api.host);
      api.setState({ visible: false });
    };
    api.host.addEventListener('click', onClick);
    return () => api.host.removeEventListener('click', onClick);
  },
  inputsChanged: (api, prev) => {
    const visible = api.inputs().visible !== false;
    if (visible === (prev.visible !== false) || visible === api.state().visible) return;
    api.setState({ visible });
  },
});
