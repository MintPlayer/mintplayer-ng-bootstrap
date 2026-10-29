import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The scheduler's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-scheduler` (Angular), `BsScheduler` (React, Vue) and
 * `mp-scheduler` (Lit) from it, the core in `scheduler.core.ts` and the
 * templates in `templates/`. The event editor composes the datetime picker.
 */
export default {
  group: 'scheduler',
  styles: [{ scope: 'SCHEDULER_SCOPE', sheet: 'schedulerScopedStyles' }],
  components: {
    scheduler: {
      core: 'schedulerCore',
      doc: [
        'A calendar and resource scheduler (#437): year, month, week, day and timeline views over `events`',
        'and `resources`. Drag (or the keyboard) creates, moves and resizes; every change is a request',
        '(`eventCreate`, `eventUpdate`, `eventDelete`, `resource*`) the consumer applies to its own data.',
        'Two-way: `view`, `date`, `selectedEvent`, `selectedRange`. Strings come from `options.messages`.',
      ].join('\n'),
      inputs: {
        type: 'SchedulerInputs',
        fields: {
          events: { default: '[]', kind: false },
          resources: { default: '[]', kind: false },
          options: { default: 'null', kind: false },
          readonly: { default: 'false', kind: 'boolean', reflect: true },
          eventEditor: { default: 'true', kind: 'boolean' },
          locale: { default: 'null', kind: 'string' },
          firstDayOfWeek: { default: 'null', kind: 'number' },
          slotDuration: { default: 'null', kind: 'number' },
          timeFormat: { default: 'null', kind: 'string' },
          view: { default: 'null', kind: 'string', model: true },
          date: { default: 'null', kind: false, model: true },
          selectedEvent: { default: 'null', kind: false, model: true },
          selectedRange: { default: 'null', kind: false, model: true },
        },
      },
      outputs: {
        eventSelected: { type: 'SchedulerEventSelectedDetail', doc: 'An event was selected by click, tap or focus.' },
        eventDblClick: { type: 'SchedulerEventDblClickDetail', doc: 'An event was activated twice (double click or double tap).' },
        eventCreate: { type: 'SchedulerEventCreateDetail', doc: 'A request to create an event over a range (drag, Enter, the popover).' },
        eventUpdate: { type: 'SchedulerEventUpdateDetail', doc: 'A request to apply a move, resize or editor change.' },
        eventDelete: { type: 'SchedulerEventDeleteDetail', doc: 'A request to delete an event.' },
        dateClick: { type: 'SchedulerDateClickDetail', doc: 'A day of the month or year view was clicked.' },
        selectionChanged: { type: 'SchedulerSelectionChangeDetail', doc: 'The selected event or range changed.' },
        resourceCreate: { type: 'SchedulerResourceCreateDetail', doc: 'A request to add a resource (optionally under a group).' },
        groupCreate: { type: 'SchedulerGroupCreateDetail', doc: 'A request to add a group (optionally under a group).' },
        resourceUpdate: { type: 'SchedulerResourceUpdateDetail', doc: 'A request to rename or recolour a resource.' },
        resourceDelete: { type: 'SchedulerResourceDeleteDetail', doc: 'A request to delete a resource.' },
        viewChange: { type: 'ViewType', doc: 'The view, after it changed.' },
        dateChange: { type: 'Date', doc: 'The shown date, after it changed.' },
        selectedEventChange: { type: 'SchedulerEvent | null', doc: 'The selected event, after it changed.' },
        selectedRangeChange: { type: 'TimeRange | null', doc: 'The range selection, after it changed.' },
      },
      methods: {
        type: 'SchedulerMethods',
        fields: {
          next: { doc: 'The next period.' },
          prev: { doc: 'The previous period.' },
          today: { doc: 'The period containing today.' },
          gotoDate: { doc: 'The period containing a date.' },
          changeView: { doc: 'Switch the view, and announce it.' },
          clearSelection: { doc: 'Clear the range selection.' },
          addEvent: { doc: "Add an event to the scheduler's own copy, and announce it." },
          updateEvent: { doc: "Replace an event in the scheduler's own copy, and announce it." },
          removeEvent: { doc: "Remove an event from the scheduler's own copy, and announce it." },
          getEventById: { doc: 'An event by id, or null.' },
          refetchEvents: { doc: 'Re-render from the current events.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
