import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The rating's manifest (#458 M7): `bs-rating` (Angular, a ControlValueAccessor),
 * `BsRating` (React, Vue `v-model:value`) and `mp-rating` (Lit).
 */
export default {
  group: 'rating',
  style: { scope: 'rating' },
  components: {
    rating: {
      core: 'ratingCore',
      doc: 'A star rating as native radios in a radiogroup: `value` (two-way, 0 for none) out of `maximum`. Works without JavaScript.',
      inputs: {
        type: 'RatingInputs',
        fields: {
          value: { default: '0', kind: 'number', model: true },
          maximum: { default: '5', kind: 'number' },
          disabled: { default: 'false', reflect: true },
          name: { default: 'null', kind: 'string', doc: "The radios' form name; null derives one from the id." },
          label: { default: "'Rating'", kind: 'string', doc: 'Names the radiogroup; a consumer `aria-label` wins.' },
          starLabel: {
            default: '(star: number, maximum: number) => `Rate ${star} out of ${maximum} stars`',
            kind: false,
            doc: "Each star's accessible name, as a formatter (word order differs across languages).",
          },
        },
      },
      outputs: {
        valueChange: { type: 'number', doc: 'The user picked a star.' },
        previewChange: { type: 'number | null', doc: 'The star under the pointer; null when it leaves.' },
      },
    },
  },
} satisfies ComponentGroup;
