import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The datetime picker's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-datetime-picker` (Angular), `BsDatetimePicker` (React, Vue) and
 * `mp-datetime-picker` (Lit) from it, the core in `datetime-picker.core.ts` and
 * the template in `templates/`.
 */
export default {
  group: 'datetime-picker',
  styles: [
    { scope: 'CALENDAR_SCOPE', sheet: 'calendarScopedStyles', from: '@mintplayer/ui-core/calendar' },
    { scope: 'TIMEPICKER_SCOPE', sheet: 'timepickerScopedStyles', from: '@mintplayer/ui-core/timepicker' },
    { scope: 'DATETIME_PICKER_SCOPE', sheet: 'datetimePickerScopedStyles' },
  ],
  components: {
    'datetime-picker': {
      core: 'datetimePickerCore',
      doc: [
        'A date-and-time field with a month-grid popup and a slot-list popup (#437).',
        '',
        'With JavaScript off it is a native datetime-local field that submits `name` as',
        'YYYY-MM-DDTHH:MM. Once hydrated the field becomes a readonly display, two buttons open the',
        'grid and the list in native popovers, and a hidden input carries the submitted value.',
      ].join('\n'),
      inputs: {
        type: 'DatetimePickerInputs',
        fields: {
          value: { default: 'null', kind: false, model: true },
          min: { default: 'null', kind: false },
          max: { default: 'null', kind: false },
          disableDateFn: { default: 'null', kind: false },
          firstDayOfWeek: { default: '1', kind: 'number' },
          locale: { default: 'null', kind: 'string' },
          hour12: { default: "'auto'", kind: false },
          step: { default: '15', kind: 'number', reflect: true },
          defaultTime: { default: '{ hour: 0, minute: 0 }', kind: false },
          placeholder: { default: 'null', kind: 'string' },
          showClear: { default: 'false', kind: 'boolean', reflect: true },
          disabled: { default: 'false', kind: 'boolean', reflect: true },
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
        valueChange: { type: 'Date | null', doc: 'The value changed by the user: a picked day or time, Today, Now, clear.' },
        openChange: { type: 'DatetimePopup', doc: "Which popup is open now: 'date', 'time', or null." },
      },
      methods: {
        type: 'DatetimePickerMethods',
        fields: {
          openDate: { doc: 'Open the month grid (ignored when disabled).' },
          openTime: { doc: 'Open the slot list (ignored when disabled).' },
          closePopups: { doc: 'Close whichever popup is open.' },
          clear: { doc: 'Clear the value (ignored when disabled).' },
        },
      },
    },
  },
} satisfies ComponentGroup;
