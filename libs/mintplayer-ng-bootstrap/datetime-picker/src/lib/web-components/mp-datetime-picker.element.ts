import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import type { FirstDayOfWeek } from '@mintplayer/ng-bootstrap/calendar';
import type { Hour12Mode, TimeStep } from '@mintplayer/ng-bootstrap/timepicker';
import { styles } from './mp-datetime-picker.element.template';

export type DatetimePopup = 'date' | 'time' | null;

const CALENDAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1H2zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5z"/></svg>`;
const CLOCK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>`;
const CLEAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>`;

let instanceCounter = 0;

/**
 * mp-datetime-picker — Bootstrap-styled combined date+time picker WC.
 *
 * Renders an input-group with a read-only display input, an optional clear
 * button, a calendar trigger (📅), and a time trigger (🕐). Phase 5 ships
 * just the shell — no popups yet (Phase 6 wires the calendar + time-list
 * popups via mutual-exclusion `openPopup` state).
 *
 * Properties:
 *  - value:     Date | null. Single instant.
 *  - min/max:   bounds (date-only comparison).
 *  - placeholder, showClear, disabled.
 *  - Forwarded to inner popups: disableDateFn, firstDayOfWeek, locale, hour12,
 *    step (and defaultTime in Phase 11).
 *
 * Events (bubbles + composed):
 *  - `value-change`         fires when value updates from user input.
 *  - `opened` / `closed`    fires with detail = 'date' | 'time' on popup state changes.
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
    placeholder: { attribute: 'placeholder', type: String, reflect: true },
    showClear: { attribute: 'show-clear', type: Boolean, reflect: true },
    disabled: { attribute: 'disabled', type: Boolean, reflect: true },
    dateButtonLabel: { attribute: 'date-button-label', type: String, reflect: true },
    timeButtonLabel: { attribute: 'time-button-label', type: String, reflect: true },
    clearLabel: { attribute: 'clear-label', type: String, reflect: true },
    _openPopup: { state: true },
  };

  value: Date | null = null;
  min: Date | null = null;
  max: Date | null = null;
  disableDateFn: ((date: Date) => boolean) | null = null;
  firstDayOfWeek: FirstDayOfWeek = 1;
  locale: string | undefined = undefined;
  hour12: Hour12Mode = 'auto';
  step: TimeStep = 15;
  placeholder = '';
  showClear = false;
  disabled = false;
  dateButtonLabel = 'Choose date';
  timeButtonLabel = 'Choose time';
  clearLabel = 'Clear';

  protected _openPopup: DatetimePopup = null;

  protected readonly instanceId = `mp-dtp-${++instanceCounter}`;
  protected readonly datePopupId = `${this.instanceId}-popup-date`;
  protected readonly timePopupId = `${this.instanceId}-popup-time`;

  @query('button.date')
  protected dateTriggerEl?: HTMLButtonElement;

  @query('button.time')
  protected timeTriggerEl?: HTMLButtonElement;

  override connectedCallback(): void {
    super.connectedCallback();
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

  /* ---- Public API ---- */

  setValue(next: Date | null, emit = true): void {
    this.value = next ? new Date(next.getTime()) : null;
    this.requestUpdate();
    if (emit) {
      this.dispatchEvent(
        new CustomEvent<Date | null>('value-change', {
          detail: this.value ? new Date(this.value.getTime()) : null,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  clear(): void {
    if (this.disabled) return;
    this.setValue(null);
  }

  get openPopup(): DatetimePopup {
    return this._openPopup;
  }

  /* ---- Handlers ---- */

  protected onDateTriggerClick = (event: MouseEvent): void => {
    if (this.disabled) return;
    event.stopPropagation();
    // Phase 6 will wire actual popup open/close. For now, we fire the
    // request events so consumers (and tests) can observe trigger activations.
    this.dispatchEvent(
      new CustomEvent<'date'>('request-open', { detail: 'date', bubbles: true, composed: true }),
    );
  };

  protected onTimeTriggerClick = (event: MouseEvent): void => {
    if (this.disabled) return;
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<'time'>('request-open', { detail: 'time', bubbles: true, composed: true }),
    );
  };

  protected onClearClick = (event: MouseEvent): void => {
    if (this.disabled) return;
    event.stopPropagation();
    this.clear();
  };

  /* ---- Render ---- */

  protected override render(): TemplateResult {
    const displayValue = this.formatDisplay();
    const hasValue = this.value !== null;
    const showClearBtn = this.showClear && hasValue && !this.disabled;
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
          .innerHTML="${CALENDAR_ICON_SVG}"
        ></button>
        <button
          class="trigger time"
          type="button"
          aria-haspopup="listbox"
          aria-expanded="${this._openPopup === 'time' ? 'true' : 'false'}"
          aria-controls="${this.timePopupId}"
          aria-label="${this.timeButtonLabel}"
          ?disabled="${this.disabled}"
          @click="${this.onTimeTriggerClick}"
          .innerHTML="${CLOCK_ICON_SVG}"
        ></button>
      </div>
      <!-- Popups will be rendered in Phase 6. Element ids reserved here so
           aria-controls + tests have stable targets. -->
      <div class="popup popup-date" id="${this.datePopupId}" role="dialog" hidden></div>
      <div class="popup popup-time" id="${this.timePopupId}" role="listbox" hidden></div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-datetime-picker')) {
  customElements.define('mp-datetime-picker', MpDatetimePickerElement);
}
