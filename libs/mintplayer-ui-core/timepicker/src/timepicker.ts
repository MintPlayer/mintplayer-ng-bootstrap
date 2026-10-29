import { errorFeedback } from '@mintplayer/ui-core/forms';
/**
 * The time list and the time picker, framework-neutral (PRD #437).
 *
 * The time list is an APG listbox of equally spaced slots, one real button per
 * option with a roving tabindex: real focus, never `aria-activedescendant`.
 * Bounds are minutes from midnight, a pure time of day; a composite that edits
 * a datetime derives the per-day bound itself (see the datetime picker).
 *
 * The time picker mirrors the date picker. No-JS: a native `<input type="time">`
 * with `name`, `min`, `max` and `step`, which the browser edits and submits.
 * Once hydrated: a readonly field showing the locale's time, a hidden input
 * carrying `name` (as `HH:MM`), and a trigger opening the list in a native
 * `popover`.
 */

export const TIMEPICKER_SCOPE = 'timepicker';

export type TimepickerBag = Record<string, string | number | boolean | null>;

export type TimeStep = 1 | 5 | 10 | 15 | 30 | 60;
/** `'auto'` lets the locale decide; an attribute's string form is accepted too. */
export type Hour12Mode = boolean | 'auto';

const MINUTES_PER_DAY = 24 * 60;

/** A `Date`'s time of day as minutes from midnight. */
export function minutesOfDay(date: Date | null | undefined): number | null {
  return date ? date.getHours() * 60 + date.getMinutes() : null;
}

/** The slot spacing used when `step` holds no usable value. */
export const DEFAULT_TIME_STEP: TimeStep = 15;

/**
 * The slot spacing `step` actually yields: a finite number of minutes in
 * (0, 1440], else {@link DEFAULT_TIME_STEP}. A removed numeric attribute is
 * null and a non-numeric one NaN; dividing the day by either hung the page or
 * rendered an empty listbox.
 */
export function resolveTimeStep(step: unknown): number {
  return typeof step === 'number' && Number.isFinite(step) && step > 0 && step <= MINUTES_PER_DAY ? step : DEFAULT_TIME_STEP;
}

/**
 * `hour12` as Intl takes it: true / false, or undefined for the locale's own
 * clock. The attribute form arrives as a string: a bare `hour12` or `"true"`
 * is true, `"false"` false, anything else the locale's.
 */
export function resolveHour12(mode: Hour12Mode | string | null | undefined): boolean | undefined {
  if (mode === true || mode === '' || mode === 'true') return true;
  if (mode === false || mode === 'false') return false;
  return undefined;
}

/** `HH:MM`, as a native time field and a submitted form carry it. */
export const isoTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Minutes from midnight of an `HH:MM[:SS]` string, or null. */
export function parseIsoTime(value: string | null | undefined): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value ?? '');
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes < MINUTES_PER_DAY ? minutes : null;
}

/** The locale's hours and minutes for a time of day. */
export function formatTime(minutes: number, locale: string | null, hour12: Hour12Mode | string | null): string {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return date.toLocaleTimeString(locale ?? undefined, { hour: '2-digit', minute: '2-digit', hour12: resolveHour12(hour12) });
}

/** `minutes` on the day of `carrier` (today when null). */
export function withTimeOfDay(carrier: Date | null, minutes: number): Date {
  const day = carrier ? new Date(carrier) : new Date();
  day.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return day;
}

/** Every slot of the day, `step` minutes apart. */
export function timeSlots(step: unknown): number[] {
  const spacing = resolveTimeStep(step);
  return Array.from({ length: Math.floor(MINUTES_PER_DAY / spacing) }, (_, i) => i * spacing);
}

/** The slot at or below `minutes`. */
export const snapToSlot = (minutes: number, step: unknown) => Math.floor(minutes / resolveTimeStep(step)) * resolveTimeStep(step);

export const isTimeDisabled = (minutes: number, minMinutes: number | null, maxMinutes: number | null) =>
  (minMinutes !== null && minutes < minMinutes) || (maxMinutes !== null && minutes > maxMinutes);

/**
 * The slot a key moves focus to from `from`, or null when the key is not the
 * list's. ArrowUp/Down one slot, Home/End the ends, PageUp/Down one hour.
 * Out-of-range slots stay in the traversal (APG: a disabled option is
 * discoverable); selecting one is refused instead.
 */
export function timeListKeyTarget(key: string, from: number, step: unknown): number | null {
  const slots = timeSlots(step);
  const last = slots[slots.length - 1];
  const index = Math.max(0, slots.indexOf(snapToSlot(from, step)));
  switch (key) {
    case 'ArrowUp': return slots[Math.max(0, index - 1)];
    case 'ArrowDown': return slots[Math.min(slots.length - 1, index + 1)];
    case 'Home': return slots[0];
    case 'End': return last;
    case 'PageUp': return snapToSlot(Math.max(0, from - 60), step);
    case 'PageDown': return snapToSlot(Math.min(last, from + 60), step);
    default: return null;
  }
}

export interface TimeListLabels {
  /** The listbox, unless the consumer's `aria-label` names it. */
  list: string;
}

export const DEFAULT_TIME_LIST_LABELS: TimeListLabels = { list: 'Select time' };

export interface TimeListOptions {
  readonly id: string;
  /** The selected time of day, or null. */
  readonly selected: number | null;
  /** The slot the user last moved to, or null for the selected one. */
  readonly focused: number | null;
  readonly step: unknown;
  readonly minMinutes: number | null;
  readonly maxMinutes: number | null;
  readonly locale: string | null;
  readonly hour12: Hour12Mode | string | null;
  readonly hydrated: boolean;
  readonly label: string | null;
  readonly labels?: Partial<TimeListLabels>;
}

export interface TimeSlotView {
  key: string;
  item: TimepickerBag;
  option: TimepickerBag;
  text: string;
}

export interface TimeListView {
  root: TimepickerBag;
  list: TimepickerBag;
  slots: TimeSlotView[];
}

export const timeSlotId = (id: string, minutes: number) => `${id}-slot-${minutes}`;

/** The slot holding the tab stop: the user's last, else the selected one's, else the first. */
export function rovingSlot(options: Pick<TimeListOptions, 'focused' | 'selected' | 'step'>): number {
  if (options.focused !== null) return snapToSlot(options.focused, options.step);
  return options.selected !== null ? snapToSlot(options.selected, options.step) : 0;
}

export function connectTimeList(options: TimeListOptions): TimeListView {
  const { id, hydrated, minMinutes, maxMinutes } = options;
  const labels = { ...DEFAULT_TIME_LIST_LABELS, ...options.labels };

  const roving = rovingSlot(options);
  return {
    root: { class: 'mp-time-list', id: `${id}-list`, role: 'listbox', 'aria-label': options.label ?? labels.list },
    list: { class: 'time-list', role: 'presentation' },
    slots: timeSlots(options.step).map((minutes) => {
      const disabled = isTimeDisabled(minutes, minMinutes, maxMinutes);
      return {
        key: String(minutes),
        item: { role: 'presentation' },
        option: {
          type: 'button',
          class: ['time-slot', disabled ? 'time-slot-disabled' : null].filter(Boolean).join(' '),
          role: 'option',
          id: timeSlotId(id, minutes),
          'data-minutes': minutes,
          'aria-selected': minutes === options.selected ? 'true' : 'false',
          'aria-disabled': disabled ? 'true' : null,
          // Inert until hydration, like the calendar's days: nothing to do with JS off.
          tabindex: hydrated ? (minutes === roving ? 0 : -1) : null,
          disabled: !hydrated,
        },
        text: formatTime(minutes, options.locale, options.hour12),
      };
    }),
  };
}

export interface TimepickerLabels extends TimeListLabels {
  /** The trigger. */
  trigger: string;
  /** The field, unless the consumer's `aria-label` names it. */
  input: string;
}

export const DEFAULT_TIMEPICKER_LABELS: TimepickerLabels = {
  ...DEFAULT_TIME_LIST_LABELS,
  trigger: 'Choose time',
  input: 'Selected time',
};

export interface TimepickerOptions {
  readonly id: string;
  readonly selected: number | null;
  readonly focused: number | null;
  readonly open: boolean;
  readonly step: unknown;
  readonly minMinutes: number | null;
  readonly maxMinutes: number | null;
  readonly locale: string | null;
  readonly hour12: Hour12Mode | string | null;
  readonly disabled: boolean;
  readonly placeholder: string | null;
  readonly required: boolean;
  /** Marks the field invalid and shows `errorText` under it. */
  readonly invalid: boolean;
  readonly errorText: string | null;
  readonly name: string | null;
  readonly hydrated: boolean;
  readonly label: string | null;
  readonly labels?: Partial<TimepickerLabels>;
}

export interface TimepickerView {
  root: TimepickerBag;
  group: TimepickerBag;
  input: TimepickerBag;
  /** The validation message, rendered after the group while invalid with a message. */
  showFeedback: boolean;
  feedback: { attrs: TimepickerBag; text: string };
  /** Carries `name` once hydrated; null before, when the native time field does. */
  hidden: TimepickerBag | null;
  /** Null before hydration: the native field is the no-JS path. */
  trigger: TimepickerBag | null;
  popup: TimepickerBag;
  timeList: TimeListView;
}

export const timepickerPopupId = (id: string) => `${id}-popup`;

export function connectTimepicker(options: TimepickerOptions): TimepickerView {
  const { id, hydrated, disabled, selected } = options;
  const labels = { ...DEFAULT_TIMEPICKER_LABELS, ...options.labels };

  const timeList = connectTimeList({
    id,
    selected,
    focused: options.focused,
    step: options.step,
    minMinutes: options.minMinutes,
    maxMinutes: options.maxMinutes,
    locale: options.locale,
    hour12: options.hour12,
    hydrated,
    label: null,
    labels,
  });
  const iso = selected === null ? '' : isoTime(selected);
  const error = errorFeedback(`${id}-error`, options.errorText, options.invalid);
  return {
    root: { class: ['mp-timepicker', disabled ? 'mp-timepicker-disabled' : null].filter(Boolean).join(' ') },
    group: { class: 'input-group' },
    input: {
      class: 'form-control timepicker-input',
      id: `${id}-input`,
      type: hydrated ? 'text' : 'time',
      readonly: hydrated,
      'aria-readonly': hydrated ? 'true' : null,
      name: hydrated ? null : options.name,
      value: hydrated ? (selected === null ? '' : formatTime(selected, options.locale, options.hour12)) : iso,
      min: hydrated || options.minMinutes === null ? null : isoTime(options.minMinutes),
      max: hydrated || options.maxMinutes === null ? null : isoTime(options.maxMinutes),
      step: hydrated ? null : resolveTimeStep(options.step) * 60,
      placeholder: options.placeholder || null,
      disabled,
      'aria-label': options.label ?? labels.input,
      required: options.required,
      'aria-required': options.required ? 'true' : null,
      ...error.control,
    },
    showFeedback: !!error.message,
    feedback: error.message ? { attrs: error.message.attrs, text: error.message.text } : { attrs: {}, text: '' },
    hidden: hydrated && options.name ? { type: 'hidden', name: options.name, value: iso, class: 'timepicker-value' } : null,
    trigger: hydrated
      ? {
          type: 'button',
          class: 'btn btn-outline-secondary timepicker-trigger',
          popovertarget: timepickerPopupId(id),
          'aria-haspopup': 'listbox',
          'aria-expanded': options.open ? 'true' : 'false',
          'aria-controls': `${id}-list`,
          'aria-label': labels.trigger,
          disabled,
        }
      : null,
    popup: { class: 'timepicker-popup', id: timepickerPopupId(id), popover: 'auto' },
    timeList,
  };
}
