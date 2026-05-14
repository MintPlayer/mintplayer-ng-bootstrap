import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { styles } from './mp-calendar.element.template';

export type FirstDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isInMonth: boolean;
}

export interface CalendarWeek {
  number: number;
  days: (CalendarDay | null)[];
}

const CHEVRON_LEFT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>`;
const CHEVRON_RIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>`;

let instanceCounter = 0;

/**
 * mp-calendar — Bootstrap-styled month grid primitive.
 *
 * Standalone Lit element, framework-agnostic. The Angular wrapper
 * (`bs-calendar`) is a thin shell that forwards inputs/outputs.
 *
 * APG Date Picker keyboard model: arrows ±1 day / ±1 week, Home/End to week
 * edges, PageUp/Down ±1 month, Ctrl+PageUp/Down ±1 year, Enter/Space selects.
 *
 * Events:
 *  - `selected-date-change`  fires on click + Enter/Space.
 *  - `current-month-change`  fires on chevron clicks + month-crossing keys.
 *
 * Both bubble and compose so light-DOM Angular hosts pick them up.
 */
export class MpCalendarElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    selectedDate: { attribute: false },
    currentMonth: { attribute: false },
    disableDateFn: { attribute: false },
    min: { attribute: false },
    max: { attribute: false },
    firstDayOfWeek: { attribute: 'first-day-of-week', type: Number, reflect: true },
    locale: { attribute: 'locale', type: String, reflect: true },
    _focusedDate: { state: true },
  };

  selectedDate: Date | null = null;
  currentMonth: Date | null = null;
  disableDateFn: ((date: Date) => boolean) | null = null;
  min: Date | null = null;
  max: Date | null = null;
  firstDayOfWeek: FirstDayOfWeek = 1;
  locale: string | undefined = undefined;

  private _focusedDate: Date | null = null;
  private pendingFocusMove = false;
  private readonly instanceId = `mp-cal-${++instanceCounter}`;
  private readonly monthLabelId = `${this.instanceId}-month`;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.currentMonth === null) {
      this.currentMonth = new Date();
    }
  }

  override updated(changed: Map<string, unknown>): void {
    if (this.pendingFocusMove) {
      this.pendingFocusMove = false;
      const target = this._focusedDate;
      if (target) {
        const cell = this.renderRoot.querySelector<HTMLElement>(
          `[id="${this.cellId(target)}"]`,
        );
        cell?.focus();
      }
    }
  }

  cellId(date: Date): string {
    return `${this.instanceId}-cell-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  isSameDate(a: Date | null, b: Date | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private isToday(date: Date): boolean {
    return this.isSameDate(date, new Date());
  }

  /** Disabled if out of [min, max] (date-only) or rejected by disableDateFn. */
  private isDisabled(date: Date): boolean {
    if (this.min && this.dateOnly(date) < this.dateOnly(this.min)) return true;
    if (this.max && this.dateOnly(date) > this.dateOnly(this.max)) return true;
    return !!this.disableDateFn && this.disableDateFn(date);
  }

  private dateOnly(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  /** Compute the weeks rendered for the current month, honoring firstDayOfWeek. */
  private getWeeks(month: Date): CalendarWeek[] {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startOfGrid = this.startOfWeek(first);
    const endOfGrid = this.endOfWeek(last);
    const totalDays = this.daysBetween(startOfGrid, endOfGrid) + 1;

    const allDays: CalendarDay[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startOfGrid.getFullYear(), startOfGrid.getMonth(), startOfGrid.getDate() + i);
      allDays.push({
        date: d,
        dayOfMonth: d.getDate(),
        isInMonth: d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth(),
      });
    }
    const weeks: CalendarWeek[] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      const days = allDays.slice(i, i + 7);
      const inMonth = days.find((d) => d.isInMonth);
      const refDate = inMonth ? inMonth.date : days[0].date;
      weeks.push({
        number: this.weekOfYear(refDate),
        days,
      });
    }
    return weeks;
  }

  /** First day of the visible grid — Monday-on-top by default. */
  private startOfWeek(date: Date): Date {
    const day = date.getDay(); // 0=Sun..6=Sat
    const offset = (day - this.firstDayOfWeek + 7) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
  }

  private endOfWeek(date: Date): Date {
    const day = date.getDay();
    const offset = (this.firstDayOfWeek + 6 - day + 7) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
  }

  private daysBetween(a: Date, b: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((this.dateOnly(b) - this.dateOnly(a)) / msPerDay);
  }

  /** ISO-8601 week-of-year. */
  private weekOfYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /** Localized weekday short + long names, in the order driven by firstDayOfWeek. */
  private weekdayNames(): { short: string; long: string }[] {
    const baseSunday = new Date(2024, 0, 7); // 2024-01-07 was a Sunday
    const names: { short: string; long: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseSunday);
      d.setDate(baseSunday.getDate() + ((this.firstDayOfWeek + i) % 7));
      names.push({
        short: d.toLocaleString(this.locale ?? 'default', { weekday: 'short' }),
        long: d.toLocaleString(this.locale ?? 'default', { weekday: 'long' }),
      });
    }
    return names;
  }

  private monthLabel(month: Date): string {
    const m = month.toLocaleString(this.locale ?? 'default', { month: 'long' });
    return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${month.getFullYear()}`;
  }

  /**
   * The cell that should carry tabindex="0". One per month — focused, else
   * selected, else today, else first enabled day. Mirrors APG convention.
   */
  private focusableDate(): Date | null {
    const month = this.currentMonth;
    if (!month) return null;
    const inMonth = (d: Date) =>
      d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    const candidate = (d: Date | null): Date | null => (d && inMonth(d) ? d : null);

    const focused = candidate(this._focusedDate);
    if (focused) return focused;
    const selected = candidate(this.selectedDate);
    if (selected) return selected;
    const today = new Date();
    const todayInMonth = candidate(today);
    if (todayInMonth) return todayInMonth;

    for (const week of this.getWeeks(month)) {
      for (const day of week.days) {
        if (day && day.isInMonth && !this.isDisabled(day.date)) return day.date;
      }
    }
    return null;
  }

  /* ---- Public API ---- */

  previousMonth(): void {
    if (!this.currentMonth) return;
    this.setCurrentMonth(
      new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1),
    );
  }

  nextMonth(): void {
    if (!this.currentMonth) return;
    this.setCurrentMonth(
      new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1),
    );
  }

  goto(day: CalendarDay | null): void {
    if (!day || !day.isInMonth || this.isDisabled(day.date)) return;
    this.setSelectedDate(day.date);
    this._focusedDate = day.date;
    this.requestUpdate();
  }

  /* ---- Internal setters with event dispatch ---- */

  private setCurrentMonth(next: Date): void {
    const prev = this.currentMonth;
    if (prev && this.isSameYearMonth(prev, next)) return;
    this.currentMonth = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<Date>('current-month-change', {
        detail: new Date(next.getFullYear(), next.getMonth(), 1),
        bubbles: true,
        composed: true,
      }),
    );
  }

  private setSelectedDate(next: Date): void {
    this.selectedDate = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<Date>('selected-date-change', {
        detail: new Date(next.getFullYear(), next.getMonth(), next.getDate()),
        bubbles: true,
        composed: true,
      }),
    );
  }

  private isSameYearMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  /* ---- Keyboard ---- */

  private onCellKeyDown(event: KeyboardEvent, day: CalendarDay | null): void {
    if (!day || !day.isInMonth) return;
    const k = event.key;
    const isNav =
      k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' ||
      k === 'Home' || k === 'End' || k === 'PageUp' || k === 'PageDown';
    const isSelect = k === 'Enter' || k === ' ';
    if (!isNav && !isSelect) return;
    event.preventDefault();

    if (isSelect) {
      this.goto(day);
      return;
    }

    const current = day.date;
    let target = new Date(current);
    const rtl = getComputedStyle(this).direction === 'rtl';
    switch (k) {
      case 'ArrowLeft':
        target.setDate(current.getDate() + (rtl ? 1 : -1));
        break;
      case 'ArrowRight':
        target.setDate(current.getDate() + (rtl ? -1 : 1));
        break;
      case 'ArrowUp':
        target.setDate(current.getDate() - 7);
        break;
      case 'ArrowDown':
        target.setDate(current.getDate() + 7);
        break;
      case 'Home': {
        const offset = (current.getDay() - this.firstDayOfWeek + 7) % 7;
        target.setDate(current.getDate() - offset);
        break;
      }
      case 'End': {
        const offset = (this.firstDayOfWeek + 6 - current.getDay() + 7) % 7;
        target.setDate(current.getDate() + offset);
        break;
      }
      case 'PageUp':
        target = event.ctrlKey
          ? new Date(current.getFullYear() - 1, current.getMonth(), current.getDate())
          : new Date(current.getFullYear(), current.getMonth() - 1, current.getDate());
        break;
      case 'PageDown':
        target = event.ctrlKey
          ? new Date(current.getFullYear() + 1, current.getMonth(), current.getDate())
          : new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
        break;
    }
    this.moveFocusTo(target);
  }

  private moveFocusTo(target: Date): void {
    if (!this.currentMonth) return;
    if (!this.isSameYearMonth(this.currentMonth, target)) {
      this.setCurrentMonth(new Date(target.getFullYear(), target.getMonth(), 1));
    }
    this._focusedDate = target;
    this.pendingFocusMove = true;
    this.requestUpdate();
  }

  /* ---- Render ---- */

  protected override render(): TemplateResult {
    const month = this.currentMonth ?? new Date();
    const weeks = this.getWeeks(month);
    const weekdays = this.weekdayNames();
    const focusable = this.focusableDate();

    return html`
      <table role="grid" aria-labelledby="${this.monthLabelId}">
        <tr>
          <td>
            <button
              type="button"
              class="chevron-btn"
              aria-label="Previous month"
              @click="${() => this.previousMonth()}"
              .innerHTML="${CHEVRON_LEFT_SVG}"
            ></button>
          </td>
          <td colspan="6" id="${this.monthLabelId}" class="month-label" aria-live="polite">
            ${this.monthLabel(month)}
          </td>
          <td>
            <button
              type="button"
              class="chevron-btn"
              aria-label="Next month"
              @click="${() => this.nextMonth()}"
              .innerHTML="${CHEVRON_RIGHT_SVG}"
            ></button>
          </td>
        </tr>
        <tr role="row">
          <th aria-hidden="true"></th>
          ${weekdays.map(
            (d) => html`<th scope="col" role="columnheader" title="${d.long}">${d.short}</th>`,
          )}
        </tr>
        ${weeks.map(
          (week) => html`
            <tr role="row">
              <th scope="row" role="rowheader">${week.number}</th>
              ${week.days.map((day) => this.renderCell(day, focusable))}
            </tr>
          `,
        )}
      </table>
    `;
  }

  private renderCell(day: CalendarDay | null, focusable: Date | null): TemplateResult {
    const showSpan = !!day && day.isInMonth;
    const disabled = !!day && this.isDisabled(day.date);
    const selected = !!day && day.isInMonth && this.isSameDate(this.selectedDate, day.date);
    const todayCell = !!day && day.isInMonth && this.isToday(day.date);
    const isFocusable = !!day && day.isInMonth && this.isSameDate(focusable, day.date);
    const classes: string[] = [];
    if (selected) classes.push('selected');
    if (showSpan && !disabled) classes.push('cursor-pointer');
    const classAttr = classes.length ? classes.join(' ') : undefined;
    const id = day && day.isInMonth ? this.cellId(day.date) : undefined;

    return html`<td
      role="gridcell"
      id="${id ?? nothing}"
      class="${classAttr ?? nothing}"
      tabindex="${showSpan ? (isFocusable ? 0 : -1) : nothing}"
      aria-selected="${showSpan ? (selected ? 'true' : 'false') : nothing}"
      aria-current="${todayCell ? 'date' : nothing}"
      aria-disabled="${disabled ? 'true' : nothing}"
      @click="${() => this.goto(day)}"
      @keydown="${(e: KeyboardEvent) => this.onCellKeyDown(e, day)}"
    >
      ${showSpan
        ? html`<span class="${disabled ? 'text-muted' : ''}">${day.dayOfMonth}</span>`
        : nothing}
    </td>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-calendar')) {
  customElements.define('mp-calendar', MpCalendarElement);
}
