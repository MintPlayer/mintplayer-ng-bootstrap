import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import { OverlayController } from '@mintplayer/ng-bootstrap/web-components/overlay';
import { MpTimeListElement, type TimeStep, type Hour12Mode } from './mp-time-list.element';
import { styles } from './mp-timepicker.element.template';

void MpTimeListElement;

const CLOCK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>`;

let instanceCounter = 0;

/**
 * mp-timepicker — Bootstrap-styled time picker WC.
 *
 * Renders an `<input class="form-control" readonly>` displaying the selected
 * time, a clock trigger button, and a popup containing `<mp-time-list>` via
 * a default slot. Consumers can replace the time list by projecting their own
 * `<mp-time-list slot="time-list">` content, or rely on the bundled default.
 *
 * Properties forwarded to the inner time list: selectedTime, step, min, max,
 * hour12, locale.
 *
 * Events (bubbles + composed):
 *  - `selected-time-change`  fires when the inner list emits one.
 *  - `opened` / `closed`     fire on popup open/close.
 */
export class MpTimepickerElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    selectedTime: { attribute: false },
    step: { attribute: 'step', type: Number, reflect: true },
    min: { attribute: false },
    max: { attribute: false },
    hour12: { attribute: 'hour12' },
    locale: { attribute: 'locale', type: String, reflect: true },
    disabled: { attribute: 'disabled', type: Boolean, reflect: true },
    placeholder: { attribute: 'placeholder', type: String, reflect: true },
    triggerLabel: { attribute: 'trigger-label', type: String, reflect: true },
  };

  selectedTime: Date | null = null;
  step: TimeStep = 15;
  min: Date | null = null;
  max: Date | null = null;
  hour12: Hour12Mode = 'auto';
  locale: string | undefined = undefined;
  disabled = false;
  placeholder = '';
  triggerLabel = 'Choose time';

  private readonly instanceId = `mp-tp-${++instanceCounter}`;
  private readonly popupId = `${this.instanceId}-popup`;

  @query('button.trigger')
  private triggerEl?: HTMLButtonElement;

  @query('.popup')
  private popupEl?: HTMLElement;

  private readonly overlay = new OverlayController(this, {
    trigger: () => this.triggerEl ?? null,
    panel: () => this.popupEl ?? null,
    onOpen: () =>
      this.dispatchEvent(new CustomEvent('opened', { bubbles: true, composed: true })),
    onClose: () =>
      this.dispatchEvent(new CustomEvent('closed', { bubbles: true, composed: true })),
  });

  async open(): Promise<void> {
    if (this.disabled) return;
    await this.overlay.open();
  }

  close(returnFocus = true): void {
    this.overlay.close(returnFocus);
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  private resolvedHour12(): boolean | undefined {
    if (this.hour12 === true) return true;
    if (this.hour12 === false) return false;
    return undefined;
  }

  private formatDisplay(): string {
    if (!this.selectedTime) return '';
    return this.selectedTime.toLocaleTimeString(this.locale ?? undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: this.resolvedHour12(),
    });
  }

  private onTriggerClick = async (): Promise<void> => {
    if (this.disabled) return;
    await this.overlay.toggle();
  };

  private onTriggerKeyDown = async (event: KeyboardEvent): Promise<void> => {
    if (this.disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.overlay.isOpen) await this.overlay.open();
    }
  };

  private onSelectedTimeChange = (event: Event): void => {
    const detail = (event as CustomEvent<Date>).detail;
    if (!(detail instanceof Date)) return;
    this.selectedTime = detail;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<Date>('selected-time-change', {
        detail: new Date(detail.getTime()),
        bubbles: true,
        composed: true,
      }),
    );
    this.overlay.close();
  };

  protected override render(): TemplateResult {
    const displayValue = this.formatDisplay();
    return html`
      <div class="input-group">
        <input
          class="form-control"
          type="text"
          readonly
          aria-readonly="true"
          .value="${displayValue}"
          placeholder="${this.placeholder || nothing}"
          ?disabled="${this.disabled}"
        />
        <button
          class="trigger"
          type="button"
          aria-haspopup="listbox"
          aria-expanded="${this.overlay.isOpen ? 'true' : 'false'}"
          aria-controls="${this.popupId}"
          aria-label="${this.triggerLabel}"
          ?disabled="${this.disabled}"
          @click="${this.onTriggerClick}"
          @keydown="${this.onTriggerKeyDown}"
          .innerHTML="${CLOCK_ICON_SVG}"
        ></button>
      </div>
      <div class="popup" id="${this.popupId}">
        <slot name="time-list"
          @selected-time-change="${this.onSelectedTimeChange}"
        >
          <mp-time-list
            .selectedTime="${this.selectedTime}"
            .step="${this.step}"
            .min="${this.min}"
            .max="${this.max}"
            .hour12="${this.hour12}"
            .locale="${this.locale}"
            @selected-time-change="${this.onSelectedTimeChange}"
          ></mp-time-list>
        </slot>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-timepicker')) {
  customElements.define('mp-timepicker', MpTimepickerElement);
}
