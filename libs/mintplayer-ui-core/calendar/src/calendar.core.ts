import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { connectCalendar, isDateDisabled, isSameDate, isSameYearMonth, monthOf, type CalendarLabels, type CalendarView, type FirstDayOfWeek } from './calendar';
import { attachCalendarGrid, focusCalendarCell } from './calendar.behaviour';

/**
 * The calendar's core (PRD #437 D10): what the generated Angular, React, Vue
 * and Lit components host. `calendar.component.ts` is its manifest and
 * `templates/calendar.view.vue` its markup.
 */

export interface CalendarInputs {
  /** The chosen day, two-way. */
  selectedDate: Date | null;
  /** The month shown, two-way; null shows the selected day's month, else today's. */
  currentMonth: Date | null;
  min: Date | null;
  max: Date | null;
  /** True disables a day. */
  disableDateFn: ((date: Date) => boolean) | null;
  /** 0 = Sunday … 6 = Saturday. */
  firstDayOfWeek: FirstDayOfWeek;
  /** BCP 47 tag for month and weekday names; null uses the runtime's. */
  locale: string | null;
  /** Accessible names of the month buttons and the week column. */
  labels: Partial<CalendarLabels> | null;
}

export interface CalendarState {
  selectedDate: Date | null;
  currentMonth: Date;
  /** The roving cell, once the user has moved it. */
  focusedDate: Date | null;
}

export interface CalendarEvents {
  /** A day chosen by click, Enter or Space. */
  selectedDateChange: Date;
  /** The month changed by the month buttons or a key that crossed it. */
  currentMonthChange: Date;
}

export interface CalendarMethods {
  previousMonth(): void;
  nextMonth(): void;
  /** Select a day (ignored when disabled), showing its month. */
  select(date: Date): void;
  /** Focus the roving day cell. */
  focusGrid(): void;
}

type Api = CoreApi<CalendarInputs, CalendarState, CalendarEvents>;

const initialMonth = (inputs: Readonly<CalendarInputs>) => monthOf(inputs.currentMonth ?? inputs.selectedDate ?? new Date());

function showMonth(api: Api, month: Date) {
  if (isSameYearMonth(month, api.state().currentMonth)) return;
  api.setState({ currentMonth: monthOf(month) });
  api.emit('currentMonthChange', monthOf(month));
}

function select(api: Api, date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  showMonth(api, day);
  api.setState({ selectedDate: day, focusedDate: day });
  api.emit('selectedDateChange', day);
}

export const calendarCore = defineCore<CalendarInputs, CalendarState, { view: CalendarView }, CalendarEvents, undefined, undefined, CalendarMethods>({
  state: (inputs) => ({ selectedDate: inputs.selectedDate, currentMonth: initialMonth(inputs), focusedDate: null }),
  view: ({ inputs, state, id, hydrated }) => ({
    view: connectCalendar({
      id,
      month: state.currentMonth,
      selected: state.selectedDate,
      focused: state.focusedDate,
      today: new Date(),
      firstDayOfWeek: inputs.firstDayOfWeek,
      locale: inputs.locale,
      min: inputs.min,
      max: inputs.max,
      disableDateFn: inputs.disableDateFn,
      hydrated,
      labels: inputs.labels ?? undefined,
    }),
  }),
  attach: (api) =>
    attachCalendarGrid(api.host, {
      month: () => api.state().currentMonth,
      firstDayOfWeek: () => api.inputs().firstDayOfWeek,
      limits: () => api.inputs(),
      showMonth: (month) => showMonth(api, month),
      setFocused: (date) => api.setState({ focusedDate: date }),
      select: (date) => select(api, date),
    }),
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.selectedDate !== prev.selectedDate && !isSameDate(inputs.selectedDate, api.state().selectedDate)) {
      api.setState({ selectedDate: inputs.selectedDate });
    }
    if (inputs.currentMonth !== prev.currentMonth && inputs.currentMonth && !isSameYearMonth(inputs.currentMonth, api.state().currentMonth)) {
      api.setState({ currentMonth: monthOf(inputs.currentMonth) });
    }
  },
  methods: {
    previousMonth: (api) => {
      const m = api.state().currentMonth;
      showMonth(api, new Date(m.getFullYear(), m.getMonth() - 1, 1));
    },
    nextMonth: (api) => {
      const m = api.state().currentMonth;
      showMonth(api, new Date(m.getFullYear(), m.getMonth() + 1, 1));
    },
    select: (api, date) => {
      if (!isDateDisabled(date, api.inputs())) select(api, date);
    },
    focusGrid: (api) => {
      const cell = api.host.querySelector<HTMLElement>('[data-date][tabindex="0"]');
      if (cell) focusCalendarCell(api.host, cell.dataset['date'] ?? '');
    },
  },
});
