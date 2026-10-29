import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  attachCalendarGrid,
  focusCalendarCell,
  isDateDisabled,
  isSameYearMonth,
  monthOf,
  type CalendarLabels,
  type FirstDayOfWeek,
} from '@mintplayer/ui-core/calendar';
import { trackPopovers } from '@mintplayer/ui-core/overlay';
import {
  attachTimeList,
  focusTimeSlot,
  isTimeDisabled,
  minutesOfDay,
  rovingSlotOf,
  type Hour12Mode,
  type TimeListHost,
  type TimeStep,
} from '@mintplayer/ui-core/timepicker';
import {
  connectDatetimePicker,
  DEFAULT_DATETIME_PICKER_LABELS,
  formatDateTime,
  isoDateTime,
  parseIsoDateTime,
  roundedNow,
  timeBoundsOn,
  type DatetimePickerLabels,
  type DatetimePickerView,
  type DatetimePopup,
  type TimePart,
} from './datetime-picker';

/**
 * The datetime picker's core (PRD #437 D10): what the generated Angular,
 * React, Vue and Lit components host. `datetime-picker.component.ts` is its
 * manifest and `templates/datetime-picker.view.vue` its markup.
 */

export interface DatetimePickerInputs {
  /** The picked date and time, two-way. */
  value: Date | null;
  /** The earliest datetime: days before it are disabled, and on its own day so are earlier slots. */
  min: Date | null;
  max: Date | null;
  /** True disables a day in the grid. A native datetime field (no JS) cannot honour it. */
  disableDateFn: ((date: Date) => boolean) | null;
  firstDayOfWeek: FirstDayOfWeek;
  locale: string | null;
  hour12: Hour12Mode;
  step: TimeStep;
  /** The time a picked day gets when there is no value yet. */
  defaultTime: TimePart;
  placeholder: string | null;
  /** Show a clear button while there is a value. */
  showClear: boolean;
  disabled: boolean;
  required: boolean;
  /** Marks the field invalid and shows `errorText` under it. */
  invalid: boolean;
  /** The validation message, referenced from the field while `invalid`. */
  errorText: string | null;
  /** Names the field when no `aria-label` does. */
  inputLabel: string | null;
  /** The value submits under this name, as `YYYY-MM-DDTHH:MM`. */
  name: string | null;
  labels: Partial<DatetimePickerLabels> | null;
  calendarLabels: Partial<CalendarLabels> | null;
}

export interface DatetimePickerState {
  value: Date | null;
  currentMonth: Date;
  focusedDate: Date | null;
  focusedMinutes: number | null;
  open: DatetimePopup;
  announcement: string;
}

export interface DatetimePickerEvents {
  /** The value changed: a picked day or time, Today, Now, clear, or a value typed before hydration. */
  valueChange: Date | null;
  /** Which popup is open now: 'date', 'time', or null. */
  openChange: DatetimePopup;
}

export interface DatetimePickerMethods {
  openDate(): void;
  openTime(): void;
  closePopups(): void;
  clear(): void;
}

type Api = CoreApi<DatetimePickerInputs, DatetimePickerState, DatetimePickerEvents>;

const popupOf = (api: Api, kind: 'date' | 'time') => api.host.querySelector<HTMLElement>(`.datetime-picker-popup-${kind}`);
const fieldOf = (api: Api) => api.host.querySelector<HTMLInputElement>('input.datetime-picker-input');
const labelsOf = (api: Api) => ({ ...DEFAULT_DATETIME_PICKER_LABELS, ...api.inputs().labels });

/** The field shows the locale's date and time and the hidden input the ISO form: a bag value is only a seed. */
function syncField(api: Api) {
  const { value } = api.state();
  const { locale, hour12 } = api.inputs();
  const field = fieldOf(api);
  if (field?.type === 'text') field.value = formatDateTime(value, locale, hour12);
  const hidden = api.host.querySelector<HTMLInputElement>('input.datetime-picker-value');
  if (hidden) hidden.value = value ? isoDateTime(value) : '';
}

function showMonth(api: Api, month: Date) {
  if (isSameYearMonth(month, api.state().currentMonth)) return;
  api.setState({ currentMonth: monthOf(month) });
}

/** A user's change: state, display, event and a polite announcement. */
function commit(api: Api, value: Date | null) {
  const previous = api.state().value;
  if (value?.getTime() === previous?.getTime()) return;
  const labels = labelsOf(api);
  const { locale, hour12 } = api.inputs();
  api.setState({
    value,
    announcement: value ? labels.selected.replace('{value}', formatDateTime(value, locale, hour12, 'long')) : labels.cleared,
  });
  if (value) showMonth(api, value);
  syncField(api);
  api.emit('valueChange', value);
}

function setDatePart(api: Api, day: Date) {
  const { value } = api.state();
  const { defaultTime } = api.inputs();
  const [hour, minute] = value ? [value.getHours(), value.getMinutes()] : [defaultTime.hour, defaultTime.minute];
  commit(api, new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute));
}

function setTimePart(api: Api, minutes: number) {
  const day = api.state().value ?? new Date();
  commit(api, new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60));
}

function closeAndReturn(api: Api, kind: 'date' | 'time') {
  popupOf(api, kind)?.hidePopover?.();
  api.host.querySelector<HTMLElement>(`.datetime-picker-${kind}`)?.focus();
}

const timeListHost = (api: Api): TimeListHost => ({
  selected: () => minutesOfDay(api.state().value),
  focused: () => api.state().focusedMinutes,
  step: () => api.inputs().step,
  limits: () => timeBoundsOn(api.state().value ?? new Date(), api.inputs().min, api.inputs().max),
  setFocused: (minutes) => api.setState({ focusedMinutes: minutes }),
  select: (minutes) => {
    setTimePart(api, minutes);
    closeAndReturn(api, 'time');
  },
});

export const datetimePickerCore = defineCore<
  DatetimePickerInputs,
  DatetimePickerState,
  { view: DatetimePickerView },
  DatetimePickerEvents,
  undefined,
  undefined,
  DatetimePickerMethods
>({
  state: (inputs) => ({
    value: inputs.value,
    currentMonth: monthOf(inputs.value ?? new Date()),
    focusedDate: null,
    focusedMinutes: null,
    open: null,
    announcement: '',
  }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectDatetimePicker({
      id,
      value: state.value,
      month: state.currentMonth,
      focusedDate: state.focusedDate,
      focusedMinutes: state.focusedMinutes,
      now: new Date(),
      open: state.open,
      firstDayOfWeek: inputs.firstDayOfWeek,
      locale: inputs.locale,
      hour12: inputs.hour12,
      step: inputs.step,
      min: inputs.min,
      max: inputs.max,
      disableDateFn: inputs.disableDateFn,
      placeholder: inputs.placeholder,
      showClear: inputs.showClear,
      disabled: inputs.disabled,
      required: inputs.required,
      invalid: inputs.invalid,
      errorText: inputs.errorText,
      name: inputs.name,
      hydrated,
      label: label ?? inputs.inputLabel,
      announcement: state.announcement,
      labels: inputs.labels ?? undefined,
      calendarLabels: inputs.calendarLabels ?? undefined,
    }),
  }),
  attach: (api) => {
    const host = api.host;
    // A value typed into the native field before hydration is the user's.
    const field = fieldOf(api);
    const typed = field?.type === 'datetime-local' ? parseIsoDateTime(field.value) : null;
    if (typed && typed.getTime() !== api.state().value?.getTime()) {
      api.setState({ value: typed, currentMonth: monthOf(typed) });
      api.emit('valueChange', typed);
    }
    // The field becomes the readonly display now: a datetime field cannot hold
    // the formatted text, and its dirty value would survive the type change.
    if (field) {
      field.type = 'text';
      field.readOnly = true;
    }
    syncField(api);

    const listHost = timeListHost(api);
    const onToggle = (event: Event) => {
      const kind = event.target === popupOf(api, 'date') ? 'date' : event.target === popupOf(api, 'time') ? 'time' : null;
      if (!kind) return;
      const opened = (event as ToggleEvent).newState === 'open';
      const open: DatetimePopup = opened ? kind : api.state().open === kind ? null : api.state().open;
      if (open === api.state().open) return;
      api.setState({ open, focusedDate: null, focusedMinutes: null });
      api.emit('openChange', open);
      // APG: opening moves focus into the dialog, onto the roving day or slot.
      const popup = popupOf(api, kind);
      if (!opened || !popup) return;
      if (kind === 'time') {
        focusTimeSlot(popup, rovingSlotOf(listHost));
        return;
      }
      const cell = popup.querySelector<HTMLElement>('[data-date][tabindex="0"]');
      if (cell?.dataset['date']) focusCalendarCell(popup, cell.dataset['date']);
    };
    const onClick = (event: Event) => {
      const button = (event.target as Element).closest?.<HTMLButtonElement>('button');
      if (!button || !host.contains(button)) return;
      if (button.classList.contains('datetime-picker-clear')) {
        commit(api, null);
        fieldOf(api)?.focus();
      } else if (button.classList.contains('datetime-picker-today')) {
        const today = new Date();
        if (!isDateDisabled(today, api.inputs())) setDatePart(api, today);
        closeAndReturn(api, 'date');
      } else if (button.classList.contains('datetime-picker-now')) {
        const now = roundedNow(new Date(), api.inputs().step);
        const { minMinutes, maxMinutes } = listHost.limits();
        if (!isTimeDisabled(minutesOfDay(now)!, minMinutes, maxMinutes)) setTimePart(api, minutesOfDay(now)!);
        closeAndReturn(api, 'time');
      }
    };
    const onTriggerKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown') return;
      const trigger = (event.target as Element).closest?.<HTMLElement>('.datetime-picker-date, .datetime-picker-time');
      if (!trigger || trigger.tagName !== 'BUTTON' || !host.contains(trigger)) return;
      event.preventDefault();
      popupOf(api, trigger.classList.contains('datetime-picker-date') ? 'date' : 'time')?.showPopover?.();
    };

    host.addEventListener('toggle', onToggle, { capture: true });
    host.addEventListener('click', onClick);
    host.addEventListener('keydown', onTriggerKey);
    const untrack = trackPopovers(host, () => host.querySelector<HTMLElement>('.input-group'), { matchAnchorWidth: false });
    const datePopup = popupOf(api, 'date');
    const timePopup = popupOf(api, 'time');
    const ungrid = datePopup
      ? attachCalendarGrid(datePopup, {
          month: () => api.state().currentMonth,
          firstDayOfWeek: () => api.inputs().firstDayOfWeek,
          limits: () => api.inputs(),
          showMonth: (month) => showMonth(api, month),
          setFocused: (date) => api.setState({ focusedDate: date }),
          select: (date) => {
            setDatePart(api, date);
            closeAndReturn(api, 'date');
          },
        })
      : () => undefined;
    const unlist = timePopup ? attachTimeList(timePopup, listHost) : () => undefined;
    return () => {
      host.removeEventListener('toggle', onToggle, { capture: true });
      host.removeEventListener('click', onClick);
      host.removeEventListener('keydown', onTriggerKey);
      untrack();
      ungrid();
      unlist();
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.value !== prev.value && inputs.value?.getTime() !== api.state().value?.getTime()) {
      // A value written from outside is not announced: the user did not make it.
      api.setState({ value: inputs.value });
      if (inputs.value) showMonth(api, inputs.value);
    }
    if (inputs.disabled && api.state().open) {
      popupOf(api, 'date')?.hidePopover?.();
      popupOf(api, 'time')?.hidePopover?.();
    }
    syncField(api);
  },
  methods: {
    openDate: (api) => {
      if (!api.inputs().disabled) popupOf(api, 'date')?.showPopover?.();
    },
    openTime: (api) => {
      if (!api.inputs().disabled) popupOf(api, 'time')?.showPopover?.();
    },
    closePopups: (api) => {
      popupOf(api, 'date')?.hidePopover?.();
      popupOf(api, 'time')?.hidePopover?.();
    },
    clear: (api) => {
      if (!api.inputs().disabled) commit(api, null);
    },
  },
});
