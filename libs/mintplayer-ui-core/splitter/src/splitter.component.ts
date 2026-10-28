import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The splitter group's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-splitter` + `bs-splitter-panel` (Angular), `BsSplitter` +
 * `BsSplitterPanel` (React, Vue) and `mp-splitter` + `mp-splitter-panel` (Lit)
 * from it, the cores in `splitter.core.ts` and the templates in `templates/`.
 */
export default {
  group: 'splitter',
  styles: [{ scope: 'SPLITTER_SCOPE', sheet: 'splitterScopedStyles' }],
  components: {
    splitter: {
      core: 'splitterCore',
      doc: [
        'Resizable panels along one axis. Put splitter panels inside; a divider between every two is dragged,',
        'or focused and moved with the arrow keys (Shift for 1% steps), Home and End. Nest splitters for',
        'two-dimensional layouts. With JavaScript off the panels share the space evenly.',
      ].join('\n'),
      inputs: {
        type: 'SplitterInputs',
        fields: {
          orientation: { default: "'horizontal'", kind: 'string' },
          minPanelSize: { default: '50', kind: 'number' },
          touchMode: { default: 'false', kind: 'boolean' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        resizeStart: { type: 'SplitterResizeEventDetail', doc: 'A divider drag started, with the sizes before it.' },
        resizing: { type: 'SplitterResizeEventDetail', doc: 'Every frame of a divider drag, with the sizes it previews.' },
        resizeEnd: { type: 'SplitterResizeEventDetail', doc: 'A drag or a key committed new sizes.' },
      },
      methods: {
        type: 'SplitterMethods',
        fields: {
          getPanelSizes: { doc: 'The panel sizes in px, in document order.' },
          setPanelSizes: { doc: 'Set the panel sizes in px, one per panel. Emits nothing.' },
          resizeDividerBy: { doc: 'Move a divider as its arrow, Home or End key would.' },
        },
      },
    },
    'splitter-panel': {
      core: 'splitterPanelCore',
      doc: 'One panel of a splitter. Its content fills the panel.',
    },
  },
} satisfies ComponentGroup;
