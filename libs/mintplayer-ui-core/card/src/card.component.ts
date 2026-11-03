import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The card group's manifest (#458 M4): `@mintplayer/nx-component-compiler`
 * generates `bs-card*` (Angular), `BsCard*` (React, Vue) and `mp-card*` (Lit)
 * from it, the cores in `card.ts` and the templates in `templates/`. Every part
 * ships the card part, so raw `.card-title` / `.card-text` / `.card-link`
 * markup inside a card is styled too (sub classes, #458 Q2).
 */
const PART = 'card-part.view.vue';

const color = { default: 'null', kind: 'string' } as const;

export default {
  group: 'card',
  style: { scope: 'card', bootstrap: ['card'] },
  components: {
    card: {
      core: 'cardCore',
      template: PART,
      doc: "Bootstrap's card: a `.card` around its header, body, image and footer parts. `color` fills it; `outline` colours only its border.",
      inputs: { type: 'CardInputs', fields: { color, outline: { default: 'false' } } },
    },
    'card-header': {
      core: 'cardHeaderCore',
      template: PART,
      doc: "The card's header cap. A nav inside it takes the nav's `cardHeader` for Bootstrap's header tabs or pills.",
      inputs: { type: 'CardCapInputs', fields: { color } },
    },
    'card-footer': {
      core: 'cardFooterCore',
      template: PART,
      doc: "The card's footer cap.",
      inputs: { type: 'CardCapInputs', fields: { color } },
    },
    'card-body': { core: 'cardBodyCore', template: PART, doc: "The card's padded body." },
    'card-title': {
      core: 'cardTitleCore',
      template: PART,
      doc: 'A card title: `role="heading"` at `level` (5 by default, matching Bootstrap\'s visual h5).',
      inputs: { type: 'CardTitleInputs', fields: { level: { default: '5' } } },
    },
    'card-subtitle': { core: 'cardSubtitleCore', template: PART, doc: 'A card subtitle.' },
    'card-text': { core: 'cardTextCore', template: PART, doc: 'A paragraph of card text.' },
    'card-group': { core: 'cardGroupCore', template: PART, doc: 'Cards side by side with joined borders.' },
    'card-img': {
      core: 'cardImgCore',
      doc: 'A card image at the top or bottom, or `overlay` with the content laid over it. Without `alt` it is decorative.',
      inputs: {
        type: 'CardImgInputs',
        fields: { position: { default: "'top'" }, src: { default: 'null', kind: 'string' }, alt: { default: 'null', kind: 'string' } },
      },
    },
    'card-link': {
      core: 'cardLinkCore',
      doc: 'A link in a card. Sibling links are spaced apart.',
      inputs: { type: 'CardLinkInputs', fields: { href: { default: 'null', kind: 'string' } } },
    },
  },
} satisfies ComponentGroup;
