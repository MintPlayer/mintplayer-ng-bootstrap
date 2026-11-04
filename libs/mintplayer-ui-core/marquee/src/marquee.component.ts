import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The marquee's manifest (#458 M5): `bs-marquee` (Angular), `BsMarquee`
 * (React, Vue) and `mp-marquee` (Lit).
 */
export default {
  group: 'marquee',
  style: { scope: 'marquee' },
  components: {
    marquee: {
      core: 'marqueeCore',
      doc: 'A scrolling ticker with a pause button (`pauseText` / `resumeText`), named by `label`. Hover, focus and reduced motion stop it.',
      inputs: {
        type: 'MarqueeInputs',
        fields: {
          label: { default: 'null', kind: 'string' },
          pauseText: { default: "'Pause'", kind: 'string' },
          resumeText: { default: "'Resume'", kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
