import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The carousel group's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-carousel` + `bs-carousel-item` (Angular), `BsCarousel` +
 * `BsCarouselItem` (React, Vue) and `mp-carousel` + `mp-carousel-item` (Lit)
 * from it, the cores in `carousel.core.ts` and the templates in `templates/`.
 */
export default {
  group: 'carousel',
  style: { scope: 'carousel', bootstrap: ['carousel'] },
  components: {
    carousel: {
      core: 'carouselCore',
      doc: [
        'A deck of slides shown one at a time, with optional indicators, autoplay, touch swipe and keyboard.',
        '',
        'Put carousel items inside. A radio per slide holds the index, so the server render navigates with',
        'JavaScript off (indicators, prev/next with wrap-around, the radio group arrow keys). Slides are',
        'grid-stacked: the deck is as tall as its tallest slide. An `aria-label` names the region.',
      ].join('\n'),
      inputs: {
        type: 'CarouselInputs',
        fields: {
          animation: { default: "'slide'", kind: 'string' },
          orientation: { default: "'horizontal'", kind: 'string' },
          indicators: { default: 'false', kind: 'boolean' },
          interval: { default: 'null', kind: 'number' },
          wrap: { default: 'true', kind: 'boolean' },
          keyboardEvents: { default: 'true', kind: 'boolean' },
          paused: { default: 'false', kind: 'boolean', model: true },
          inputLabel: { default: 'null', kind: 'string' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        slideChange: { type: 'CarouselSlideChangeEventDetail', doc: 'The committed slide changed.' },
        pausedChange: { type: 'boolean', doc: 'Autoplay was paused or resumed from the play/pause button or a method.' },
        slideStart: { type: 'void', doc: 'A slide transition started.' },
        slideEnd: { type: 'void', doc: 'A slide transition ended.' },
      },
      methods: {
        type: 'CarouselMethods',
        fields: {
          previous: { doc: 'Go to the previous slide.' },
          next: { doc: 'Go to the next slide.' },
          goto: { doc: 'Go to a slide by index.' },
          play: { doc: 'Resume autoplay.' },
          pause: { doc: 'Pause autoplay.' },
          togglePaused: { doc: 'Toggle autoplay.' },
        },
      },
    },
    'carousel-item': {
      core: 'carouselItemCore',
      doc: 'One slide of a carousel. Its content is the slide.',
    },
  },
} satisfies ComponentGroup;
