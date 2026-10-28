import { errorFeedback } from '@mintplayer/ui-core/forms';
import {
  connectCalendar,
  isDateDisabled,
  isoDate,
  isSameDate,
  type CalendarLabels,
  type CalendarView,
  type DateLimits,
  type FirstDayOfWeek,
} from '@mintplayer/ui-core/calendar';
import {
  connectTimeList,
  isoTime,
  isTimeDisabled,
  minutesOfDay,
  resolveHour12,
  resolveTimeStep,
  snapToSlot,
  type Hour12Mode,
  type TimeListView,
} from '@mintplayer/ui-core/timepicker';

/**
 * The datetime picker, framework-neutral (PRD #437): one field, a date
 * trigger opening the month grid and a time trigger opening the slot list,
 * each in its own native `popover` (opening one light-dismisses the other).
 *
 * No-JS: the field is a native `<input type="datetime-local">` with `name`,
 * `min`, `max` and `step`, which the browser edits and submits. Once hydrated
 * it becomes a readonly field showing the locale's short date and time, a
 * hidden input carries `name` (as `YYYY-MM-DDTHH:MM`), and the triggers and an
 * optional clear button appear.
 */

export const DATETIME_PICKER_SCOPE = 'datetime-picker';

export type DatetimePickerBag = Record<string, string | number | boolean | null>;

/** Which popup is open. */
export type DatetimePopup = 'date' | 'time' | null;

/** The time a picked day gets when there is no value yet. */
export interface TimePart {
  hour: number;
  minute: number;
}

export interface DatetimePickerLabels {
  /** The field, unless the consumer's `aria-label` or `inputLabel` names it. */
  input: string;
  /** The date trigger, and the dialog it opens. */
  dateButton: string;
  /** The time trigger, and the dialog it opens. */
  timeButton: string;
  /** The listbox inside the time dialog. */
  list: string;
  clear: string;
  today: string;
  now: string;
  /** The live announcement after a pick; `{value}` is the long date and time. */
  selected: string;
  /** The live announcement after clearing. */
  cleared: string;
}

export const DEFAULT_DATETIME_PICKER_LABELS: DatetimePickerLabels = {
  input: 'Selected date and time',
  dateButton: 'Choose date',
  timeButton: 'Choose time',
  list: 'Select time',
  clear: 'Clear',
  today: 'Today',
  now: 'Now',
  selected: '{value} selected',
  cleared: 'Cleared',
};

/** `YYYY-MM-DDTHH:MM`, as a native datetime-local field and a submitted form carry it. */
export const isoDateTime = (value: Date) => `${isoDate(value)}T${isoTime(minutesOfDay(value)!)}`;

/** A `YYYY-MM-DDTHH:MM[:SS]` string as a local `Date`, or null. */
export function parseIsoDateTime(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value ?? '');
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const date = new Date(y, mo - 1, d, h, mi);
  return date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

/** The locale's short date and time, as the hydrated field shows it. */
export function formatDateTime(value: Date | null, locale: string | null, hour12: Hour12Mode | string | null, dateStyle: 'short' | 'long' = 'short'): string {
  return value ? value.toLocaleString(locale ?? undefined, { dateStyle, timeStyle: 'short', hour12: resolveHour12(hour12) }) : '';
}

/**
 * The time bounds that apply on `day`: `min` / `max` are datetimes, so their
 * time of day bounds the list only on their own day.
 */
export function timeBoundsOn(day: Date, min: Date | null, max: Date | null): { minMinutes: number | null; maxMinutes: number | null } {
  return {
    minMinutes: min && isSameDate(day, min) ? minutesOfDay(min) : null,
    maxMinutes: max && isSameDate(day, max) ? minutesOfDay(max) : null,
  };
}

/** `now`, snapped down to the step: what the Now button writes. */
export function roundedNow(now: Date, step: unknown): Date {
  const rounded = new Date(now);
  rounded.setMinutes(snapToSlot(now.getMinutes(), step), 0, 0);
  return rounded;
}

export interface DatetimePickerOptions extends DateLimits {
  readonly id: string;
  readonly value: Date | null;
  readonly month: Date;
  readonly focusedDate: Date | null;
  readonly focusedMinutes: number | null;
  readonly now: Date;
  readonly open: DatetimePopup;
  readonly firstDayOfWeek: FirstDayOfWeek;
  readonly locale: string | null;
  readonly hour12: Hour12Mode | string | null;
  readonly step: unknown;
  readonly placeholder: string | null;
  readonly showClear: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
  /** Marks the field invalid and shows `errorText` under it. */
  readonly invalid: boolean;
  readonly errorText: string | null;
  readonly name: string | null;
  readonly hydrated: boolean;
  readonly label: string | null;
  /** The pending live announcement. */
  readonly announcement: string;
  readonly labels?: Partial<DatetimePickerLabels>;
  readonly calendarLabels?: Partial<CalendarLabels>;
}

export interface DatetimePickerView {
  root: DatetimePickerBag;
  group: DatetimePickerBag;
  input: DatetimePickerBag;
  /** Carries `name` once hydrated; null before, when the native field does. */
  hidden: DatetimePickerBag | null;
  /** Null before hydration, without `showClear`, or without a value. */
  clear: DatetimePickerBag | null;
  /** Null before hydration: the native field is the no-JS path. */
  dateTrigger: DatetimePickerBag | null;
  timeTrigger: DatetimePickerBag | null;
  showFeedback: boolean;
  feedback: { attrs: DatetimePickerBag; text: string };
  live: DatetimePickerBag;
  liveText: string;
  datePopup: DatetimePickerBag;
  calendar: CalendarView;
  dateFooter: DatetimePickerBag;
  today: DatetimePickerBag;
  todayText: string;
  timePopup: DatetimePickerBag;
  timeList: TimeListView;
  timeFooter: DatetimePickerBag;
  now: DatetimePickerBag;
  nowText: string;
}

export const datetimeDatePopupId = (id: string) => `${id}-popup-date`;
export const datetimeTimePopupId = (id: string) => `${id}-popup-time`;

export function connectDatetimePicker(options: DatetimePickerOptions): DatetimePickerView {
  const { id, hydrated, disabled, value } = options;
  const labels = { ...DEFAULT_DATETIME_PICKER_LABELS, ...options.labels };
  const scoped = (bag: DatetimePickerBag): DatetimePickerBag => ({ ...bag, 'data-mps': DATETIME_PICKER_SCOPE });
  const error = errorFeedback(`${id}-error`, options.errorText, options.invalid);
  const iso = value ? isoDateTime(value) : '';
  const datePopupId = datetimeDatePopupId(id);
  const timePopupId = datetimeTimePopupId(id);
  const bounds = timeBoundsOn(value ?? options.now, options.min, options.max);
  const now = roundedNow(options.now, options.step);
  const trigger = (kind: 'date' | 'time', popupId: string, label: string) =>
    hydrated
      ? scoped({
          type: 'button',
          class: `btn btn-outline-secondary datetime-picker-trigger datetime-picker-${kind}`,
          popovertarget: popupId,
          'aria-haspopup': 'dialog',
          'aria-expanded': options.open === kind ? 'true' : 'false',
          'aria-controls': popupId,
          'aria-label': label,
          disabled,
        })
      : null;
  const footerButton = (kind: string, unavailable: boolean) =>
    scoped({ type: 'button', class: `btn btn-primary btn-sm datetime-picker-${kind}`, disabled: !hydrated || unavailable });
  return {
    root: scoped({ class: ['mp-datetime-picker', disabled ? 'mp-datetime-picker-disabled' : null].filter(Boolean).join(' ') }),
    group: scoped({ class: 'input-group' }),
    input: scoped({
      class: 'form-control datetime-picker-input',
      id: `${id}-input`,
      type: hydrated ? 'text' : 'datetime-local',
      readonly: hydrated,
      'aria-readonly': hydrated ? 'true' : null,
      name: hydrated ? null : options.name,
      value: hydrated ? formatDateTime(value, options.locale, options.hour12) : iso,
      min: hydrated || !options.min ? null : isoDateTime(options.min),
      max: hydrated || !options.max ? null : isoDateTime(options.max),
      step: hydrated ? null : resolveTimeStep(options.step) * 60,
      placeholder: options.placeholder || null,
      disabled,
      required: options.required,
      'aria-required': options.required ? 'true' : null,
      'aria-label': options.label ?? labels.input,
      ...error.control,
    }),
    hidden: hydrated && options.name ? scoped({ type: 'hidden', name: options.name, value: iso, class: 'datetime-picker-value' }) : null,
    clear:
      hydrated && options.showClear && value && !disabled
        ? scoped({ type: 'button', class: 'btn btn-outline-secondary datetime-picker-trigger datetime-picker-clear', 'aria-label': labels.clear })
        : null,
    dateTrigger: trigger('date', datePopupId, labels.dateButton),
    timeTrigger: trigger('time', timePopupId, labels.timeButton),
    showFeedback: !!error.message,
    feedback: error.message ? { attrs: { ...error.message.attrs, 'data-mps': DATETIME_PICKER_SCOPE }, text: error.message.text } : { attrs: {}, text: '' },
    live: scoped({ class: 'visually-hidden', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }),
    liveText: options.announcement,
    datePopup: scoped({ class: 'datetime-picker-popup datetime-picker-popup-date', id: datePopupId, popover: 'auto', role: 'dialog', 'aria-label': labels.dateButton }),
    calendar: connectCalendar({
      id: `${id}-calendar`,
      month: options.month,
      selected: value,
      focused: options.focusedDate,
      today: options.now,
      firstDayOfWeek: options.firstDayOfWeek,
      locale: options.locale,
      min: options.min,
      max: options.max,
      disableDateFn: options.disableDateFn,
      hydrated,
      labels: options.calendarLabels,
    }),
    dateFooter: scoped({ class: 'datetime-picker-footer' }),
    today: footerButton('today', isDateDisabled(options.now, options)),
    todayText: labels.today,
    timePopup: scoped({ class: 'datetime-picker-popup datetime-picker-popup-time', id: timePopupId, popover: 'auto', role: 'dialog', 'aria-label': labels.timeButton }),
    timeList: connectTimeList({
      id,
      selected: minutesOfDay(value),
      focused: options.focusedMinutes,
      step: options.step,
      minMinutes: bounds.minMinutes,
      maxMinutes: bounds.maxMinutes,
      locale: options.locale,
      hour12: options.hour12,
      hydrated,
      label: null,
      labels: { list: labels.list },
    }),
    timeFooter: scoped({ class: 'datetime-picker-footer' }),
    now: footerButton('now', isTimeDisabled(minutesOfDay(now)!, bounds.minMinutes, bounds.maxMinutes)),
    nowText: labels.now,
  };
}
