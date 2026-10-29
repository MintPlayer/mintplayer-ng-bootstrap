import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The date picker's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-datepicker` (Angular), `BsDatepicker` (React, Vue) and
 * `mp-datepicker` (Lit) from it, the core in `datepicker.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'datepicker',
  style: { scope: 'datepicker' },
  components: {
    datepicker: {
      core: 'datepickerCore',
      doc: [
        'A date field with a month-grid popup (#437): the APG date picker dialog.',
        '',
        'With JavaScript off it is a native date field that submits `name` as YYYY-MM-DD. Once',
        'hydrated the field becomes a readonly display, a button opens the grid in a native popover,',
        'and a hidden input carries the submitted value.',
      ].join('\n'),
      inputs: {
        type: 'DatepickerInputs',
        fields: {
          selectedDate: { default: 'null', kind: false, model: true },
          currentMonth: { default: 'null', kind: false, model: true },
          min: { default: 'null', kind: false },
          max: { default: 'null', kind: false },
          disableDateFn: { default: 'null', kind: false },
          firstDayOfWeek: { default: '1', kind: 'number' },
          locale: { default: 'null', kind: 'string' },
          disabled: { default: 'false', kind: 'boolean', reflect: true },
          placeholder: { default: 'null', kind: 'string' },
          required: { default: 'false', kind: 'boolean' },
          invalid: { default: 'false', kind: 'boolean', reflect: true },
          errorText: { default: 'null', kind: 'string' },
          inputLabel: { default: 'null', kind: 'string' },
          name: { default: 'null', kind: 'string' },
          labels: { default: 'null', kind: false },
          calendarLabels: { default: 'null', kind: false },
        },
      },
      outputs: {
        selectedDateChange: { type: 'Date', doc: 'A day picked in the grid, or typed into the field before hydration.' },
        currentMonthChange: { type: 'Date', doc: 'The grid moved to another month.' },
        openChange: { type: 'boolean', doc: 'The popup opened (true) or closed (false).' },
      },
      methods: {
        type: 'DatepickerMethods',
        fields: {
          open: { doc: 'Open the grid (ignored when disabled).' },
          close: { doc: 'Close the grid.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
