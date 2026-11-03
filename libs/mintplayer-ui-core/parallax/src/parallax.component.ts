import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The parallax band's manifest (#458 M5): `bs-parallax` (Angular),
 * `BsParallax` (React, Vue) and `mp-parallax` (Lit).
 */
export default {
  group: 'parallax',
  style: { scope: 'parallax' },
  components: {
    parallax: {
      core: 'parallaxCore',
      doc: 'A decorative band `height` pixels tall whose background `image` stays fixed while the page scrolls (it scrolls along under reduced motion).',
      inputs: {
        type: 'ParallaxInputs',
        fields: {
          height: { default: '150', kind: 'number' },
          image: { default: 'null', kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
