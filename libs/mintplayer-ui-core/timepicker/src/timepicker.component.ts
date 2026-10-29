import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The time list's and the time picker's manifest (PRD #437 D10):
 * `@mintplayer/nx-component-compiler` generates `bs-time-list` / `bs-timepicker`
 * (Angular), `BsTimeList` / `BsTimepicker` (React, Vue) and `mp-time-list` /
 * `mp-timepicker` (Lit) from it, the cores in `timepicker.core.ts` and the
 * templates in `templates/`.
 */
export default {
  group: 'timepicker',
  style: { scope: 'timepicker' },
  components: {
    'time-list': {
      core: 'timeListCore',
      doc: [
        'A listbox of time slots (#437): one real button per option, a roving tabindex, the APG keymap',
        '(arrows, Home/End, PageUp/PageDown one hour). Bounds are minutes from midnight.',
        'With JavaScript off the slots render inert.',
      ].join('\n'),
      inputs: {
        type: 'TimeListInputs',
        fields: {
          selectedTime: { default: 'null', kind: false, model: true },
          step: { default: '15', kind: 'number', reflect: true },
          minMinutes: { default: 'null', kind: 'number' },
          maxMinutes: { default: 'null', kind: 'number' },
          hour12: { default: "'auto'", kind: false },
          locale: { default: 'null', kind: 'string' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        selectedTimeChange: { type: 'Date', doc: 'A slot chosen by click, Enter or Space.' },
      },
      methods: { type: 'TimeListMethods', fields: { focusList: { doc: 'Focus the roving slot.' } } },
    },
    timepicker: {
      core: 'timepickerCore',
      doc: [
        'A time field with a slot-list popup (#437).',
        '',
        'With JavaScript off it is a native time field that submits `name` as HH:MM. Once hydrated the',
        'field becomes a readonly display, a button opens the list in a native popover, and a hidden',
        'input carries the submitted value.',
      ].join('\n'),
      inputs: {
        type: 'TimepickerInputs',
        fields: {
          selectedTime: { default: 'null', kind: false, model: true },
          step: { default: '15', kind: 'number', reflect: true },
          min: { default: 'null', kind: false },
          max: { default: 'null', kind: false },
          hour12: { default: "'auto'", kind: false },
          locale: { default: 'null', kind: 'string' },
          disabled: { default: 'false', kind: 'boolean', reflect: true },
          placeholder: { default: 'null', kind: 'string' },
          required: { default: 'false', kind: 'boolean' },
          invalid: { default: 'false', kind: 'boolean', reflect: true },
          errorText: { default: 'null', kind: 'string' },
          inputLabel: { default: 'null', kind: 'string' },
          name: { default: 'null', kind: 'string' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        selectedTimeChange: { type: 'Date', doc: 'A slot picked in the list, or a time typed into the field before hydration.' },
        openChange: { type: 'boolean', doc: 'The popup opened (true) or closed (false).' },
      },
      methods: {
        type: 'TimepickerMethods',
        fields: {
          open: { doc: 'Open the list (ignored when disabled).' },
          close: { doc: 'Close the list.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
