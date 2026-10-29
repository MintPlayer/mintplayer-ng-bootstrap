import { errorFeedback } from '@mintplayer/ui-core/forms';
import { connectCalendar, isoDate, type CalendarLabels, type CalendarView, type DateLimits, type FirstDayOfWeek } from '@mintplayer/ui-core/calendar';

/**
 * The date picker, framework-neutral (PRD #437): a display field, a trigger,
 * and the month grid in a native `popover` dialog.
 *
 * No-JS: the field is a native `<input type="date">` with `name`, `min` and
 * `max`, so the browser's own picker edits and submits the date. Once
 * hydrated it becomes a readonly field showing the locale's short date, a
 * hidden input carries `name`, and the trigger opens the grid (which adds
 * `disableDateFn`, `firstDayOfWeek` and `locale`, none of which a native date
 * input can honour).
 */

export const DATEPICKER_SCOPE = 'datepicker';

export type DatepickerBag = Record<string, string | number | boolean | null>;

export interface DatepickerLabels {
  /** The trigger, and the dialog it opens. */
  trigger: string;
  /** The field, unless the consumer's `aria-label` names it. */
  input: string;
}

export const DEFAULT_DATEPICKER_LABELS: DatepickerLabels = { trigger: 'Choose date', input: 'Selected date' };

export interface DatepickerOptions extends DateLimits {
  readonly id: string;
  readonly selected: Date | null;
  readonly month: Date;
  readonly focused: Date | null;
  readonly today: Date;
  readonly open: boolean;
  readonly firstDayOfWeek: FirstDayOfWeek;
  readonly locale: string | null;
  readonly disabled: boolean;
  readonly placeholder: string | null;
  readonly required: boolean;
  /** Marks the field invalid and shows `errorText` under it. */
  readonly invalid: boolean;
  readonly errorText: string | null;
  readonly name: string | null;
  readonly hydrated: boolean;
  /** The consumer's `aria-label`, which names the field. */
  readonly label: string | null;
  readonly labels?: Partial<DatepickerLabels>;
  readonly calendarLabels?: Partial<CalendarLabels>;
}

export interface DatepickerView {
  root: DatepickerBag;
  group: DatepickerBag;
  input: DatepickerBag;
  /** The validation message, rendered after the group while invalid with a message. */
  showFeedback: boolean;
  feedback: { attrs: DatepickerBag; text: string };
  /** Carries `name` once hydrated; null before, when the native date field does. */
  hidden: DatepickerBag | null;
  /** Null before hydration: the native field's own picker is the no-JS path. */
  trigger: DatepickerBag | null;
  popup: DatepickerBag;
  calendar: CalendarView;
}

/** The locale's short date, as the hydrated field shows it. */
export function formatPickedDate(date: Date | null, locale: string | null): string {
  return date ? date.toLocaleDateString(locale ?? undefined, { dateStyle: 'short' }) : '';
}

export const datepickerPopupId = (id: string) => `${id}-popup`;

export function connectDatepicker(options: DatepickerOptions): DatepickerView {
  const { id, hydrated, disabled } = options;
  const labels = { ...DEFAULT_DATEPICKER_LABELS, ...options.labels };
  const popupId = datepickerPopupId(id);
  const error = errorFeedback(`${id}-error`, options.errorText, options.invalid);
  const iso = options.selected ? isoDate(options.selected) : '';
  return {
    root: { class: ['mp-datepicker', disabled ? 'mp-datepicker-disabled' : null].filter(Boolean).join(' ') },
    group: { class: 'input-group' },
    input: {
      class: 'form-control datepicker-input',
      id: `${id}-input`,
      type: hydrated ? 'text' : 'date',
      readonly: hydrated,
      'aria-readonly': hydrated ? 'true' : null,
      name: hydrated ? null : options.name,
      value: hydrated ? formatPickedDate(options.selected, options.locale) : iso,
      min: hydrated || !options.min ? null : isoDate(options.min),
      max: hydrated || !options.max ? null : isoDate(options.max),
      placeholder: options.placeholder || null,
      disabled,
      'aria-label': options.label ?? labels.input,
      required: options.required,
      'aria-required': options.required ? 'true' : null,
      ...error.control,
    },
    showFeedback: !!error.message,
    feedback: error.message ? { attrs: error.message.attrs, text: error.message.text } : { attrs: {}, text: '' },
    hidden: hydrated && options.name ? { type: 'hidden', name: options.name, value: iso, class: 'datepicker-value' } : null,
    trigger: hydrated
      ? {
          type: 'button',
          class: 'btn btn-outline-secondary datepicker-trigger',
          popovertarget: popupId,
          'aria-haspopup': 'dialog',
          'aria-expanded': options.open ? 'true' : 'false',
          'aria-controls': popupId,
          'aria-label': labels.trigger,
          disabled,
        }
      : null,
    popup: { class: 'datepicker-popup', id: popupId, popover: 'auto', role: 'dialog', 'aria-label': labels.trigger },
    calendar: connectCalendar({
      id: `${id}-calendar`,
      month: options.month,
      selected: options.selected,
      focused: options.focused,
      today: options.today,
      firstDayOfWeek: options.firstDayOfWeek,
      locale: options.locale,
      min: options.min,
      max: options.max,
      disableDateFn: options.disableDateFn,
      hydrated,
      labels: options.calendarLabels,
    }),
  };
}
