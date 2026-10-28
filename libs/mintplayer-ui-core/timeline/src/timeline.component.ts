import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The timeline group's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-timeline` + `bs-timeline-item` (Angular), `BsTimeline` + `BsTimelineItem`
 * (React, Vue) and `mp-timeline` + `mp-timeline-item` (Lit) from it, the cores in
 * `timeline.core.ts` and the templates in `templates/`.
 */
export default {
  group: 'timeline',
  styles: [{ scope: 'TIMELINE_SCOPE', sheet: 'timelineScopedStyles' }],
  components: {
    timeline: {
      core: 'timelineCore',
      doc: [
        'A sequence of events along a connecting line, vertical or horizontal (#437).',
        '',
        'Give it `items`, and restyle each region of a row through the `marker`, `heading`,',
        '`timestamp`, `opposite`, `content` and `connector` slots; or put timeline items inside.',
        'Layout is CSS, so the server render is already laid out. `selectable` makes it a listbox',
        'with a roving tab stop (`selectedIds` is two-way); `activatable` makes click-only rows',
        'keyboard-reachable buttons. An `aria-label` names it.',
      ].join('\n'),
      inputs: {
        type: 'TimelineInputs',
        fields: {
          items: {},
          orientation: { default: "'vertical'", reflect: true },
          align: { default: "'start'", reflect: true },
          reverse: { default: 'false', reflect: true },
          selectable: { default: "'none'", reflect: true },
          activatable: { default: 'false', reflect: true },
          selectedIds: { default: '[]', model: true },
          inputLabel: { default: 'null', kind: 'string' },
        },
      },
      outputs: {
        itemClick: { type: 'TimelineItemClickDetail', doc: 'An enabled row was clicked, or activated with Enter/Space when only activatable.' },
        selectionChanged: { type: 'TimelineSelectionChangeDetail', doc: 'The selection changed: the selected, added and removed items.' },
        selectedIdsChange: { type: 'TimelineKeys', doc: 'The keys of the selected rows.' },
      },
    },
    'timeline-item': {
      core: 'timelineItemCore',
      doc: [
        'One declarative timeline event. `itemTitle`, `description` and `time` fill its regions;',
        'the `heading`, `opposite`, `marker` and `connector` slots and its content replace them.',
        '`itemId` is its selection key.',
      ].join('\n'),
      inputs: {
        type: 'TimelineItemInputs',
        fields: {
          itemId: { kind: 'string' },
          itemTitle: { kind: 'string' },
          description: { kind: 'string' },
          time: { kind: 'string' },
          icon: { kind: 'string' },
          color: { kind: 'string' },
          disabled: { default: 'false', reflect: true },
        },
      },
    },
  },
} satisfies ComponentGroup;
