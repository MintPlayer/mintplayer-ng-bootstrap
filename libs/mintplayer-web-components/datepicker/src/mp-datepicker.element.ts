import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import { OverlayController } from '@mintplayer/web-components/overlay';
import { MpCalendarElement, type FirstDayOfWeek } from '@mintplayer/web-components/calendar';
import { styles } from './mp-datepicker.element.template';
// Side-effect: ensure mp-calendar is registered.
void MpCalendarElement;

const CALENDAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1H2zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5z"/></svg>`;

let instanceCounter = 0;

/**
 * mp-datepicker — Bootstrap-styled date picker WC.
 *
 * Renders an `<input class="form-control" readonly>` displaying the selected
 * date, a calendar trigger button, and a popup containing `<mp-calendar>` via
 * a default slot. Consumers can replace the calendar by projecting their own
 * `<mp-calendar slot="calendar">` content, or rely on the bundled default.
 *
 * Properties forwarded to the inner calendar: selectedDate, currentMonth,
 * disableDateFn, min, max, firstDayOfWeek, locale.
 *
 * Events (bubbles + composed):
 *  - `selected-date-change`  fires when the inner calendar emits one.
 *  - `current-month-change`  fires when the inner calendar emits one.
 *  - `opened` / `closed`     fire on popup open/close.
 */
export class MpDatepickerElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    selectedDate: { attribute: false },
    currentMonth: { attribute: false },
    disableDateFn: { attribute: false },
    min: { attribute: false },
    max: { attribute: false },
    firstDayOfWeek: { attribute: 'first-day-of-week', type: Number, reflect: true },
    locale: { attribute: 'locale', type: String, reflect: true },
    disabled: { attribute: 'disabled', type: Boolean, reflect: true },
    placeholder: { attribute: 'placeholder', type: String, reflect: true },
    triggerLabel: { attribute: 'trigger-label', type: String, reflect: true },
  };

  selectedDate: Date | null = null;
  currentMonth: Date | null = null;
  disableDateFn: ((date: Date) => boolean) | null = null;
  min: Date | null = null;
  max: Date | null = null;
  firstDayOfWeek: FirstDayOfWeek = 1;
  locale: string | undefined = undefined;
  disabled = false;
  placeholder = '';
  triggerLabel = 'Choose date';

  private readonly instanceId = `mp-dp-${++instanceCounter}`;
  private readonly popupId = `${this.instanceId}-popup`;

  @query('button.trigger')
  private triggerEl?: HTMLButtonElement;

  @query('.input-group')
  private inputGroupEl?: HTMLElement;

  @query('.popup')
  private popupEl?: HTMLElement;

  /**
   * The overlay positions against the entire `.input-group` wrapper (so the
   * popup aligns with the input's left edge, not the trigger button's left
   * edge — which would float in mid-air visually disconnected from the
   * field). The trigger button still owns ARIA + focus-return semantics.
   */
  private readonly overlay = new OverlayController(this, {
    anchor: () => this.inputGroupEl ?? this.triggerEl ?? null,
    trigger: () => this.triggerEl ?? null,
    panel: () => this.popupEl ?? null,
    panelWidth: 'anchor-min',
    onOpen: () => {
      this.dispatchEvent(new CustomEvent('opened', { bubbles: true, composed: true }));
    },
    onClose: () => {
      this.dispatchEvent(new CustomEvent('closed', { bubbles: true, composed: true }));
    },
  });

  /* ---- Public API ---- */

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

  /* ---- Internal ---- */

  private formatDisplay(): string {
    if (!this.selectedDate) return '';
    return this.selectedDate.toLocaleDateString(this.locale ?? undefined, {
      dateStyle: 'short',
    } as Intl.DateTimeFormatOptions);
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

  private onSelectedDateChange = (event: Event): void => {
    const detail = (event as CustomEvent<Date>).detail;
    if (!(detail instanceof Date)) return;
    this.selectedDate = detail;
    this.requestUpdate();
    // Re-emit at host level so light-DOM consumers receive a stable event source.
    this.dispatchEvent(
      new CustomEvent<Date>('selected-date-change', {
        detail: new Date(detail.getFullYear(), detail.getMonth(), detail.getDate()),
        bubbles: true,
        composed: true,
      }),
    );
    // Close popup after user picks a date.
    this.overlay.close();
  };

  private onCurrentMonthChange = (event: Event): void => {
    const detail = (event as CustomEvent<Date>).detail;
    if (!(detail instanceof Date)) return;
    this.currentMonth = detail;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<Date>('current-month-change', {
        detail: new Date(detail.getFullYear(), detail.getMonth(), 1),
        bubbles: true,
        composed: true,
      }),
    );
  };

  /* ---- Render ---- */

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
          aria-haspopup="dialog"
          aria-expanded="${this.overlay.isOpen ? 'true' : 'false'}"
          aria-controls="${this.popupId}"
          aria-label="${this.triggerLabel}"
          ?disabled="${this.disabled}"
          @click="${this.onTriggerClick}"
          @keydown="${this.onTriggerKeyDown}"
          .innerHTML="${CALENDAR_ICON_SVG}"
        ></button>
      </div>
      <div
        class="popup"
        id="${this.popupId}"
        role="dialog"
        aria-label="${this.triggerLabel}"
      >
        <slot name="calendar"
          @selected-date-change="${this.onSelectedDateChange}"
          @current-month-change="${this.onCurrentMonthChange}"
        >
          <mp-calendar
            .selectedDate="${this.selectedDate}"
            .currentMonth="${this.currentMonth}"
            .disableDateFn="${this.disableDateFn}"
            .min="${this.min}"
            .max="${this.max}"
            .firstDayOfWeek="${this.firstDayOfWeek}"
            .locale="${this.locale}"
            @selected-date-change="${this.onSelectedDateChange}"
            @current-month-change="${this.onCurrentMonthChange}"
          ></mp-calendar>
        </slot>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-datepicker')) {
  customElements.define('mp-datepicker', MpDatepickerElement);
}
