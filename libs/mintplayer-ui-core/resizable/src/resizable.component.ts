import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The resizable group's manifest (#458 M7): `@mintplayer/nx-component-compiler` generates
 * `bs-resizable` (Angular), `BsResizable` (React, Vue) and `mp-resizable` (Lit) from it, the
 * core in `resizable.core.ts` and the template in `templates/`.
 */
export default {
  group: 'resizable',
  style: { scope: 'resizable' },
  components: {
    resizable: {
      core: 'resizableCore',
      doc: [
        'A box with draggable edges and corners around any content. Drag a glyph, or focus it and use',
        'the arrow keys (10px, Shift for 1px). Inline positioning grows the box by giving back margin, so',
        'the content around it stays put; absolute positioning writes its own size and offset.',
      ].join('\n'),
      inputs: {
        type: 'ResizableInputs',
        fields: {
          positioning: { default: "'inline'", kind: 'string' },
          horizontal: { default: 'true', kind: 'boolean' },
          vertical: { default: 'true', kind: 'boolean' },
          corners: { default: 'true', kind: 'boolean' },
          labels: { default: 'null', kind: false },
          presetPosition: { default: 'null', kind: false },
        },
      },
      outputs: {
        resized: { type: 'ResizableGeometry', doc: 'A drag ended or a key moved an edge, with the geometry written.' },
      },
    },
  },
} satisfies ComponentGroup;
