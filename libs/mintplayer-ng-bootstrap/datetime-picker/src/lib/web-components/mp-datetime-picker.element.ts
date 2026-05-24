import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import { LiveAnnouncerController } from '@mintplayer/ng-bootstrap/web-components/a11y';
import { OverlayController } from '@mintplayer/web-components/overlay';
import { MpCalendarElement, type FirstDayOfWeek } from '@mintplayer/ng-bootstrap/calendar';
import { MpTimeListElement, type Hour12Mode, type TimeStep } from '@mintplayer/ng-bootstrap/timepicker';
import { styles } from './mp-datetime-picker.element.template';

void MpCalendarElement;
void MpTimeListElement;

export type DatetimePopup = 'date' | 'time' | null;

const CALENDAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1H2zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5z"/></svg>`;
const CLOCK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>`;
const CLEAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>`;

let instanceCounter = 0;

interface TimePart {
  hour: number;
  minute: number;
}

/**
 * mp-datetime-picker — Bootstrap-styled combined date+time picker.
 *
 * Renders an input-group (read-only display + optional clear + 📅 + 🕐) with
 * two mutually-exclusive popups: a date popup containing `<mp-calendar>`, and
 * a time popup containing `<mp-time-list>`. Either popup can be slot-overridden.
 *
 * Value semantics: internal split into `datePart` (year/month/day) and
 * `timePart` (hour, minute). Either popup can edit its half without losing
 * the other. The composed `Date` is exposed via `value`.
 *
 * Events (bubbles + composed):
 *  - `value-change`         fires when value updates from any user action.
 *  - `opened`               detail = 'date' | 'time' on popup open.
 *  - `closed`               detail = 'date' | 'time' on popup close.
 */
export class MpDatetimePickerElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    value: { attribute: false },
    min: { attribute: false },
    max: { attribute: false },
    disableDateFn: { attribute: false },
    firstDayOfWeek: { attribute: 'first-day-of-week', type: Number, reflect: true },
    locale: { attribute: 'locale', type: String, reflect: true },
    hour12: { attribute: 'hour12' },
    step: { attribute: 'step', type: Number, reflect: true },
    defaultTime: { attribute: false },
    placeholder: { attribute: 'placeholder', type: String, reflect: true },
    showClear: { attribute: 'show-clear', type: Boolean, reflect: true },
    disabled: { attribute: 'disabled', type: Boolean, reflect: true },
    inputLabel: { attribute: 'input-label', type: String, reflect: true },
    dateButtonLabel: { attribute: 'date-button-label', type: String, reflect: true },
    timeButtonLabel: { attribute: 'time-button-label', type: String, reflect: true },
    clearLabel: { attribute: 'clear-label', type: String, reflect: true },
    todayLabel: { attribute: 'today-label', type: String, reflect: true },
    nowLabel: { attribute: 'now-label', type: String, reflect: true },
    _openPopup: { state: true },
    _calendarMonth: { state: true },
  };

  value: Date | null = null;
  min: Date | null = null;
  max: Date | null = null;
  disableDateFn: ((date: Date) => boolean) | null = null;
  firstDayOfWeek: FirstDayOfWeek = 1;
  locale: string | undefined = undefined;
  hour12: Hour12Mode = 'auto';
  step: TimeStep = 15;
  defaultTime: TimePart = { hour: 0, minute: 0 };
  placeholder = '';
  showClear = false;
  disabled = false;
  inputLabel = 'Selected date and time';
  dateButtonLabel = 'Choose date';
  timeButtonLabel = 'Choose time';
  clearLabel = 'Clear';
  todayLabel = 'Today';
  nowLabel = 'Now';

  protected _openPopup: DatetimePopup = null;
  /** Tracks the currently-viewed month in the calendar popup. */
  protected _calendarMonth: Date | null = null;

  protected readonly instanceId = `mp-dtp-${++instanceCounter}`;
  protected readonly datePopupId = `${this.instanceId}-popup-date`;
  protected readonly timePopupId = `${this.instanceId}-popup-time`;

  @query('button.date')
  protected dateTriggerEl?: HTMLButtonElement;

  @query('button.time')
  protected timeTriggerEl?: HTMLButtonElement;

  @query('.input-group')
  protected inputGroupEl?: HTMLElement;

  @query('.popup-date')
  protected datePopupEl?: HTMLElement;

  @query('.popup-time')
  protected timePopupEl?: HTMLElement;

  // _openPopup is set eagerly in openDate()/openTime() — BEFORE the controller's
  // open() runs — so by the time the controller measures the panel rect inside
  // position(), the popup is already display: block. The controller's onOpen
  // callback only dispatches the event; closing is what reverts _openPopup back
  // to null since close() can be triggered by Esc / outside-click too.

  // Both popups anchor against the whole input-group (so they align visually
  // with the display input's left edge) but each has its own trigger button
  // for ARIA + focus-return semantics.

  protected readonly dateOverlay = new OverlayController(this, {
    anchor: () => this.inputGroupEl ?? this.dateTriggerEl ?? null,
    trigger: () => this.dateTriggerEl ?? null,
    panel: () => this.datePopupEl ?? null,
    panelWidth: 'anchor-min',
    onOpen: () => {
      this.dispatchEvent(
        new CustomEvent<'date'>('opened', { detail: 'date', bubbles: true, composed: true }),
      );
    },
    onClose: () => {
      if (this._openPopup === 'date') this._openPopup = null;
      this.dispatchEvent(
        new CustomEvent<'date'>('closed', { detail: 'date', bubbles: true, composed: true }),
      );
    },
  });

  protected readonly timeOverlay = new OverlayController(this, {
    anchor: () => this.inputGroupEl ?? this.timeTriggerEl ?? null,
    trigger: () => this.timeTriggerEl ?? null,
    panel: () => this.timePopupEl ?? null,
    panelWidth: 'anchor-min',
    onOpen: () => {
      this.dispatchEvent(
        new CustomEvent<'time'>('opened', { detail: 'time', bubbles: true, composed: true }),
      );
    },
    onClose: () => {
      if (this._openPopup === 'time') this._openPopup = null;
      this.dispatchEvent(
        new CustomEvent<'time'>('closed', { detail: 'time', bubbles: true, composed: true }),
      );
    },
  });

  protected readonly liveAnnouncer = new LiveAnnouncerController(this);
  private lastAnnouncedValue: number | null = null;

  protected override willUpdate(changed: Map<string, unknown>): void {
    // Derive the calendar's pinned month from `value` *before* render so the
    // first frame already has `_calendarMonth` set. Doing this in updated()
    // would write reactive state after the render completed and trigger
    // Lit's "change-in-update" warning.
    if (changed.has('value') && this.value && !this._calendarMonth) {
      this._calendarMonth = new Date(this.value.getFullYear(), this.value.getMonth(), 1);
    }
  }

  override updated(changed: Map<string, unknown>): void {
    super.updated?.(changed);
    if (changed.has('_openPopup')) {
      if (this._openPopup === null) {
        this.removeAttribute('data-open');
      } else {
        this.setAttribute('data-open', this._openPopup);
      }
    }
  }

  /* ---- Public API ---- */

  setValue(next: Date | null, emit = true): void {
    const same =
      (next === null && this.value === null) ||
      (next instanceof Date &&
        this.value instanceof Date &&
        next.getTime() === this.value.getTime());
    this.value = next ? new Date(next.getTime()) : null;
    if (next) {
      this._calendarMonth = new Date(next.getFullYear(), next.getMonth(), 1);
    }
    this.requestUpdate();
    if (emit && !same) {
      this.dispatchEvent(
        new CustomEvent<Date | null>('value-change', {
          detail: this.value ? new Date(this.value.getTime()) : null,
          bubbles: true,
          composed: true,
        }),
      );
      this.announceValue();
    }
  }

  /** Polite live-region announce on value change. Skipped on first render. */
  private announceValue(): void {
    const newKey = this.value ? this.value.getTime() : null;
    if (this.lastAnnouncedValue === null && newKey !== null) {
      // first explicit change emit OK to announce
    }
    if (newKey === this.lastAnnouncedValue) return;
    this.lastAnnouncedValue = newKey;
    if (this.value === null) {
      this.liveAnnouncer.announce(`${this.clearLabel}`);
      return;
    }
    const formatted = this.value.toLocaleString(this.locale ?? undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
      hour12: this.resolvedHour12(),
    } as Intl.DateTimeFormatOptions);
    this.liveAnnouncer.announce(`${formatted} selected`);
  }

  clear(): void {
    if (this.disabled) return;
    this.setValue(null);
  }

  get openPopup(): DatetimePopup {
    return this._openPopup;
  }

  async openDate(): Promise<void> {
    if (this.disabled) return;
    if (this.timeOverlay.isOpen) this.timeOverlay.close(false);
    // Set _openPopup BEFORE the controller's open() so the SCSS rule
    // `:host([data-open="date"]) .popup-date { display: block }` is already
    // active when position() measures the panel rect inside open(). Without
    // this, the panel is `display: none` at measurement time, the rect has
    // zero height, and the position-pair algorithm picks the wrong candidate.
    this._openPopup = 'date';
    await this.dateOverlay.open();
  }

  async openTime(): Promise<void> {
    if (this.disabled) return;
    if (this.dateOverlay.isOpen) this.dateOverlay.close(false);
    this._openPopup = 'time';
    await this.timeOverlay.open();
  }

  closePopups(): void {
    if (this.dateOverlay.isOpen) this.dateOverlay.close();
    if (this.timeOverlay.isOpen) this.timeOverlay.close();
  }

  /* ---- Display ---- */

  protected formatDisplay(): string {
    if (!this.value) return '';
    return this.value.toLocaleString(this.locale ?? undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: this.resolvedHour12(),
    } as Intl.DateTimeFormatOptions);
  }

  protected resolvedHour12(): boolean | undefined {
    if (this.hour12 === true) return true;
    if (this.hour12 === false) return false;
    return undefined;
  }

  /* ---- Value composition ---- */

  protected updateDatePart(date: Date): void {
    // Preserve existing time half; apply defaultTime if unset.
    const time = this.value
      ? { hour: this.value.getHours(), minute: this.value.getMinutes() }
      : { hour: this.defaultTime.hour, minute: this.defaultTime.minute };
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.hour,
      time.minute,
      0,
      0,
    );
    this.setValue(next);
  }

  protected updateTimePart(time: Date): void {
    // Preserve existing date half; default to today.
    const today = new Date();
    const date = this.value ?? today;
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      0,
      0,
    );
    this.setValue(next);
  }

  /* ---- Handlers ---- */

  protected onDateTriggerClick = async (event: MouseEvent): Promise<void> => {
    if (this.disabled) return;
    event.stopPropagation();
    if (this.dateOverlay.isOpen) {
      this.dateOverlay.close();
    } else {
      await this.openDate();
    }
  };

  protected onTimeTriggerClick = async (event: MouseEvent): Promise<void> => {
    if (this.disabled) return;
    event.stopPropagation();
    if (this.timeOverlay.isOpen) {
      this.timeOverlay.close();
    } else {
      await this.openTime();
    }
  };

  protected onDateTriggerKeyDown = async (event: KeyboardEvent): Promise<void> => {
    if (this.disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.dateOverlay.isOpen) await this.openDate();
    }
  };

  protected onTimeTriggerKeyDown = async (event: KeyboardEvent): Promise<void> => {
    if (this.disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.timeOverlay.isOpen) await this.openTime();
    }
  };

  protected onClearClick = (event: MouseEvent): void => {
    if (this.disabled) return;
    event.stopPropagation();
    this.clear();
  };

  protected onCalendarSelectedDateChange = (event: Event): void => {
    const detail = (event as CustomEvent<Date>).detail;
    if (!(detail instanceof Date)) return;
    const sameDay =
      this.value !== null &&
      this.value.getFullYear() === detail.getFullYear() &&
      this.value.getMonth() === detail.getMonth() &&
      this.value.getDate() === detail.getDate();
    this.updateDatePart(detail);
    if (sameDay) this.dateOverlay.close();
  };

  protected onCalendarCurrentMonthChange = (event: Event): void => {
    const detail = (event as CustomEvent<Date>).detail;
    if (detail instanceof Date) this._calendarMonth = detail;
  };

  protected onTimeListSelectedTimeChange = (event: Event): void => {
    const detail = (event as CustomEvent<Date>).detail;
    if (detail instanceof Date) {
      this.updateTimePart(detail);
      this.timeOverlay.close();
    }
  };

  protected onTodayClick = (): void => {
    this.updateDatePart(new Date());
  };

  protected onNowClick = (): void => {
    const now = new Date();
    const minutes = Math.floor(now.getMinutes() / this.step) * this.step;
    const rounded = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes, 0, 0);
    this.updateTimePart(rounded);
  };

  /* ---- Render ---- */

  protected override render(): TemplateResult {
    const displayValue = this.formatDisplay();
    const hasValue = this.value !== null;
    const showClearBtn = this.showClear && hasValue && !this.disabled;
    const calendarMonth = this._calendarMonth ?? (this.value ? new Date(this.value.getFullYear(), this.value.getMonth(), 1) : new Date());
    const selectedDate = this.value ?? null;
    const selectedTime = this.value ?? null;

    return html`
      <div class="input-group">
        <input
          class="form-control"
          type="text"
          readonly
          aria-readonly="true"
          aria-label="${this.inputLabel}"
          .value="${displayValue}"
          placeholder="${this.placeholder || nothing}"
          ?disabled="${this.disabled}"
        />
        ${showClearBtn
          ? html`<button
              class="trigger clear"
              type="button"
              aria-label="${this.clearLabel}"
              ?disabled="${this.disabled}"
              @click="${this.onClearClick}"
              .innerHTML="${CLEAR_ICON_SVG}"
            ></button>`
          : nothing}
        <button
          class="trigger date"
          type="button"
          aria-haspopup="dialog"
          aria-expanded="${this._openPopup === 'date' ? 'true' : 'false'}"
          aria-controls="${this.datePopupId}"
          aria-label="${this.dateButtonLabel}"
          ?disabled="${this.disabled}"
          @click="${this.onDateTriggerClick}"
          @keydown="${this.onDateTriggerKeyDown}"
          .innerHTML="${CALENDAR_ICON_SVG}"
        ></button>
        <button
          class="trigger time"
          type="button"
          aria-haspopup="dialog"
          aria-expanded="${this._openPopup === 'time' ? 'true' : 'false'}"
          aria-controls="${this.timePopupId}"
          aria-label="${this.timeButtonLabel}"
          ?disabled="${this.disabled}"
          @click="${this.onTimeTriggerClick}"
          @keydown="${this.onTimeTriggerKeyDown}"
          .innerHTML="${CLOCK_ICON_SVG}"
        ></button>
      </div>
      ${this.liveAnnouncer.template()}

      <div class="popup popup-date" id="${this.datePopupId}" role="dialog" aria-label="${this.dateButtonLabel}">
        <slot name="calendar"
          @selected-date-change="${this.onCalendarSelectedDateChange}"
          @current-month-change="${this.onCalendarCurrentMonthChange}"
        >
          <mp-calendar
            .selectedDate="${selectedDate}"
            .currentMonth="${calendarMonth}"
            .disableDateFn="${this.disableDateFn}"
            .min="${this.min}"
            .max="${this.max}"
            .firstDayOfWeek="${this.firstDayOfWeek}"
            .locale="${this.locale}"
            @selected-date-change="${this.onCalendarSelectedDateChange}"
            @current-month-change="${this.onCalendarCurrentMonthChange}"
          ></mp-calendar>
        </slot>
        <div class="popup-footer">
          <button type="button" @click="${this.onTodayClick}">${this.todayLabel}</button>
        </div>
      </div>

      <div class="popup popup-time" id="${this.timePopupId}" role="dialog" aria-label="${this.timeButtonLabel}">
        <slot name="time-list"
          @selected-time-change="${this.onTimeListSelectedTimeChange}"
        >
          <mp-time-list
            .selectedTime="${selectedTime}"
            .step="${this.step}"
            .hour12="${this.hour12}"
            .locale="${this.locale}"
            @selected-time-change="${this.onTimeListSelectedTimeChange}"
          ></mp-time-list>
        </slot>
        <div class="popup-footer">
          <button type="button" @click="${this.onNowClick}">${this.nowLabel}</button>
        </div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-datetime-picker')) {
  customElements.define('mp-datetime-picker', MpDatetimePickerElement);
}
