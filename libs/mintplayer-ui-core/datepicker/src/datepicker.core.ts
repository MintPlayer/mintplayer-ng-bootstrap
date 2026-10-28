import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  attachCalendarGrid,
  focusCalendarCell,
  isoDate,
  isSameDate,
  isSameYearMonth,
  monthOf,
  parseIsoDate,
  type CalendarLabels,
  type FirstDayOfWeek,
} from '@mintplayer/ui-core/calendar';
import { trackPopovers } from '@mintplayer/ui-core/overlay';
import { connectDatepicker, formatPickedDate, type DatepickerLabels, type DatepickerView } from './datepicker';

/**
 * The date picker's core (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `datepicker.component.ts` is its manifest and
 * `templates/datepicker.view.vue` its markup.
 */

export interface DatepickerInputs {
  /** The picked day, two-way. */
  selectedDate: Date | null;
  /** The month the grid shows, two-way; null shows the picked day's month, else today's. */
  currentMonth: Date | null;
  min: Date | null;
  max: Date | null;
  /** True disables a day in the grid. A native date field (no JS) cannot honour it. */
  disableDateFn: ((date: Date) => boolean) | null;
  firstDayOfWeek: FirstDayOfWeek;
  /** BCP 47 tag for the field's date and the grid's names; null uses the runtime's. */
  locale: string | null;
  disabled: boolean;
  placeholder: string | null;
  required: boolean;
  /** Marks the field invalid and shows `errorText` under it. */
  invalid: boolean;
  /** The validation message, referenced from the field while `invalid`. */
  errorText: string | null;
  /** Names the field when no `aria-label` does. */
  inputLabel: string | null;
  /** The date submits under this name, as `YYYY-MM-DD`. */
  name: string | null;
  /** The trigger's and the field's accessible names. */
  labels: Partial<DatepickerLabels> | null;
  /** The grid's month buttons and week column. */
  calendarLabels: Partial<CalendarLabels> | null;
}

export interface DatepickerState {
  selectedDate: Date | null;
  currentMonth: Date;
  focusedDate: Date | null;
  open: boolean;
}

export interface DatepickerEvents {
  /** A day picked in the grid. */
  selectedDateChange: Date;
  currentMonthChange: Date;
  /** The popup opened (true) or closed (false). */
  openChange: boolean;
}

export interface DatepickerMethods {
  open(): void;
  close(): void;
}

type Api = CoreApi<DatepickerInputs, DatepickerState, DatepickerEvents>;

const popupOf = (api: Api) => api.host.querySelector<HTMLElement>('.datepicker-popup');
const fieldOf = (api: Api) => api.host.querySelector<HTMLInputElement>('input.datepicker-input');

/** The field shows the locale's short date and the hidden input the ISO date: a bag value is only a seed. */
function syncField(api: Api) {
  const { selectedDate } = api.state();
  const field = fieldOf(api);
  if (field?.type === 'text') field.value = formatPickedDate(selectedDate, api.inputs().locale);
  const hidden = api.host.querySelector<HTMLInputElement>('input.datepicker-value');
  if (hidden) hidden.value = selectedDate ? isoDate(selectedDate) : '';
}

function showMonth(api: Api, month: Date) {
  if (isSameYearMonth(month, api.state().currentMonth)) return;
  api.setState({ currentMonth: monthOf(month) });
  api.emit('currentMonthChange', monthOf(month));
}

function pick(api: Api, date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  showMonth(api, day);
  api.setState({ selectedDate: day, focusedDate: day });
  syncField(api);
  api.emit('selectedDateChange', day);
  popupOf(api)?.hidePopover?.();
  api.host.querySelector<HTMLElement>('.datepicker-trigger')?.focus();
}

export const datepickerCore = defineCore<DatepickerInputs, DatepickerState, { view: DatepickerView }, DatepickerEvents, undefined, undefined, DatepickerMethods>({
  state: (inputs) => ({
    selectedDate: inputs.selectedDate,
    currentMonth: monthOf(inputs.currentMonth ?? inputs.selectedDate ?? new Date()),
    focusedDate: null,
    open: false,
  }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectDatepicker({
      id,
      selected: state.selectedDate,
      month: state.currentMonth,
      focused: state.focusedDate,
      today: new Date(),
      open: state.open,
      firstDayOfWeek: inputs.firstDayOfWeek,
      locale: inputs.locale,
      min: inputs.min,
      max: inputs.max,
      disableDateFn: inputs.disableDateFn,
      disabled: inputs.disabled,
      placeholder: inputs.placeholder,
      required: inputs.required,
      invalid: inputs.invalid,
      errorText: inputs.errorText,
      name: inputs.name,
      hydrated,
      label: label ?? inputs.inputLabel,
      labels: inputs.labels ?? undefined,
      calendarLabels: inputs.calendarLabels ?? undefined,
    }),
  }),
  attach: (api) => {
    const host = api.host;
    // A date typed into the native field before hydration is the user's.
    const field = fieldOf(api);
    const typed = field?.type === 'date' ? parseIsoDate(field.value) : null;
    if (typed && !isSameDate(typed, api.state().selectedDate)) {
      api.setState({ selectedDate: typed, currentMonth: monthOf(typed) });
      api.emit('selectedDateChange', typed);
    }
    // The field turns into the readonly display now, not on the next render:
    // a date field cannot hold the formatted text, and its dirty value would
    // survive the type change.
    if (field) {
      field.type = 'text';
      field.readOnly = true;
    }
    syncField(api);

    const onToggle = (event: Event) => {
      if (event.target !== popupOf(api)) return;
      const open = (event as ToggleEvent).newState === 'open';
      if (open === api.state().open) return;
      api.setState({ open, focusedDate: open ? api.state().focusedDate : null });
      api.emit('openChange', open);
      if (open) {
        // APG date picker dialog: opening moves focus to the grid's roving day.
        const popup = popupOf(api);
        const cell = popup?.querySelector<HTMLElement>('[data-date][tabindex="0"]');
        if (popup && cell?.dataset['date']) focusCalendarCell(popup, cell.dataset['date']);
      }
    };
    const onTriggerKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' || !(event.target as Element).closest?.('.datepicker-trigger')) return;
      event.preventDefault();
      popupOf(api)?.showPopover?.();
    };

    host.addEventListener('toggle', onToggle, { capture: true });
    host.addEventListener('keydown', onTriggerKey);
    const untrack = trackPopovers(host, () => host.querySelector<HTMLElement>('.input-group'), { matchAnchorWidth: false });
    const popup = popupOf(api);
    const ungrid = popup
      ? attachCalendarGrid(popup, {
          month: () => api.state().currentMonth,
          firstDayOfWeek: () => api.inputs().firstDayOfWeek,
          limits: () => api.inputs(),
          showMonth: (month) => showMonth(api, month),
          setFocused: (date) => api.setState({ focusedDate: date }),
          select: (date) => pick(api, date),
        })
      : () => undefined;
    return () => {
      host.removeEventListener('toggle', onToggle, { capture: true });
      host.removeEventListener('keydown', onTriggerKey);
      untrack();
      ungrid();
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.selectedDate !== prev.selectedDate && !isSameDate(inputs.selectedDate, api.state().selectedDate)) {
      // A date written from outside (a form value, a binding) brings its month into view.
      api.setState({ selectedDate: inputs.selectedDate });
      if (inputs.selectedDate) showMonth(api, inputs.selectedDate);
    }
    if (inputs.currentMonth !== prev.currentMonth && inputs.currentMonth && !isSameYearMonth(inputs.currentMonth, api.state().currentMonth)) {
      api.setState({ currentMonth: monthOf(inputs.currentMonth) });
    }
    if (inputs.disabled && api.state().open) popupOf(api)?.hidePopover?.();
    syncField(api);
  },
  methods: {
    open: (api) => {
      if (!api.inputs().disabled) popupOf(api)?.showPopover?.();
    },
    close: (api) => popupOf(api)?.hidePopover?.(),
  },
});
