import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The calendar's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-calendar` (Angular), `BsCalendar` (React, Vue) and `mp-calendar`
 * (Lit) from it, the core in `calendar.core.ts` and the template in `templates/`.
 */
export default {
  group: 'calendar',
  style: { scope: 'calendar' },
  components: {
    calendar: {
      core: 'calendarCore',
      doc: [
        'A month grid (#437): the APG date-grid keyboard, a month toolbar, ISO or locale week numbers.',
        '',
        '`selectedDate` and `currentMonth` are two-way. With JavaScript off the month renders inert:',
        'the month buttons are disabled and no day is tabbable until the page hydrates.',
      ].join('\n'),
      inputs: {
        type: 'CalendarInputs',
        fields: {
          selectedDate: { default: 'null', kind: false, model: true },
          currentMonth: { default: 'null', kind: false, model: true },
          min: { default: 'null', kind: false },
          max: { default: 'null', kind: false },
          disableDateFn: { default: 'null', kind: false },
          firstDayOfWeek: { default: '1', kind: 'number' },
          locale: { default: 'null', kind: 'string' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        selectedDateChange: { type: 'Date', doc: 'A day chosen by click, Enter or Space.' },
        currentMonthChange: { type: 'Date', doc: 'The month changed: a month button, or a key that crossed into another month.' },
      },
      methods: {
        type: 'CalendarMethods',
        fields: {
          previousMonth: { doc: 'Show the previous month.' },
          nextMonth: { doc: 'Show the next month.' },
          select: { doc: 'Select a day (ignored when disabled), showing its month.' },
          focusGrid: { doc: 'Focus the roving day cell.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
