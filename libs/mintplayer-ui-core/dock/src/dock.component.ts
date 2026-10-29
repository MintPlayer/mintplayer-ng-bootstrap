import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The dock manager's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-dock-manager` (Angular), `BsDockManager` (React, Vue) and
 * `mp-dock-manager` (Lit) from it, the core in `dock.core.ts` and the
 * templates in `templates/`. It composes the splitter.
 */
export default {
  group: 'dock',
  style: { scope: 'dock' },
  components: {
    'dock-manager': {
      core: 'dockCore',
      doc: [
        'A docking layout (#437): panes in tabbed stacks, split side by side and torn off into floating',
        'windows, by pointer, touch long-press or the keyboard (M on a tab, then T/R/B/L/F or the arrows).',
        '`layout` is two-way; the `pane` slot renders each pane by name. Strings come from `labels`.',
      ].join('\n'),
      inputs: {
        type: 'DockInputs',
        fields: {
          layout: { default: 'null', kind: false, model: true },
          debugLayoutIntegrity: { default: 'false', kind: 'boolean' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        layoutChange: { type: 'DockLayoutSnapshot', doc: 'The layout, after the user changed it.' },
        paneActivated: { type: 'DockPaneActivatedEventDetail', doc: 'A tab was activated.' },
      },
      methods: {
        type: 'DockMethods',
        fields: {
          captureLayout: { doc: 'A copy of the current layout snapshot.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
