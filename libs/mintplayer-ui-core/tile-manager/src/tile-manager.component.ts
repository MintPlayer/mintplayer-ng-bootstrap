import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The tile manager's manifest (#458 M4): `@mintplayer/nx-component-compiler`
 * generates `bs-tile-manager` (Angular), `BsTileManager` (React, Vue) and
 * `mp-tile-manager` (Lit) from it, the core in `tile-manager.core.ts` and the
 * template in `templates/`.
 */
export default {
  group: 'tile-manager',
  style: { scope: 'tile-manager' },
  components: {
    'tile-manager': {
      core: 'tileManagerCore',
      doc: [
        'A dashboard of tiles that reflow with the board width (#440): one layout per column count,',
        'drag to move, grips to resize, and the keyboard for both (M to move, R to resize, arrows, Enter',
        'or Escape). `layouts` is two-way: a commit writes the full next record. The `header` and',
        '`content` slots render each tile; they receive the tile.',
        '',
        'The server-rendered page places every tile at every width through container queries, with',
        'JavaScript off; editing starts once the board has measured itself.',
      ].join('\n'),
      inputs: {
        type: 'TileManagerComponentInputs',
        fields: {
          tiles: { default: '[]', kind: false },
          layouts: { default: '{}', kind: false, model: true },
          breakpoints: { default: 'null', kind: false },
          stackBelow: { default: 'null', kind: 'number' },
          maxColumns: { default: '6', kind: 'number' },
          minColumnWidth: { default: '200', kind: 'number' },
          minRowHeight: { default: "'8rem'", kind: 'string' },
          gap: { default: '8', kind: 'number' },
          dragMode: { default: "'header'", kind: 'string', reflect: true },
          resizeMode: { default: "'hover'", kind: 'string', reflect: true },
          animateReflow: { default: 'true', kind: 'boolean' },
          label: { default: 'null', kind: 'string' },
          messages: { default: '{}', kind: false },
        },
      },
      outputs: {
        layoutPreview: { type: 'TileLayoutChange', doc: 'Each step of a gesture or keyboard move: the layout as it would be committed.' },
        layoutChange: { type: 'TileLayoutChange', doc: 'A commit: the full layouts record and the stale narrower counts.' },
        layoutsChange: { type: 'TileLayouts', doc: 'The two-way `layouts`, after a commit.' },
        columnCountChange: { type: 'TileColumnCountChange', doc: 'The resolved column count changed.' },
        gestureBlocked: { type: 'TileGestureBlocked', doc: 'A move or resize was refused (no room, or the tile is locked).' },
      },
      methods: {
        type: 'TileManagerMethods',
        fields: {
          captureLayout: { doc: 'The rendered column count and its layout (the preview while editing).' },
          resetLayout: { doc: 'Drop the stored layout of a column count, so it derives again.' },
          isGestureActive: { doc: 'True while a pointer drag or resize is in flight.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
