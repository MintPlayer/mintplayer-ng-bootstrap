import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The accordion group's manifest (#458 M4): `@mintplayer/nx-component-compiler`
 * generates `bs-accordion` / `bs-accordion-tab` (Angular), `BsAccordion` /
 * `BsAccordionTab` (React, Vue) and `mp-accordion` / `mp-accordion-tab` (Lit)
 * from it, the cores in `accordion.ts` and the templates in `templates/`.
 */
export default {
  group: 'accordion',
  style: { scope: 'accordion', bootstrap: ['accordion'] },
  components: {
    accordion: {
      core: 'accordionCore',
      provides: 'ACCORDION',
      doc: [
        'A Bootstrap accordion on native `<details name>` (#458): every tab opens and closes with',
        'JavaScript off, and single-open is the platform\'s exclusivity. Declare `accordion-tab`s as',
        'content. Up/Down/Home/End move between headers.',
      ].join('\n'),
      inputs: {
        type: 'AccordionInputs',
        fields: {
          multi: { default: 'false', doc: 'Allow several tabs open at once.' },
          highlightActiveTab: { default: 'false', doc: 'Paint the open header with the Bootstrap active background.' },
        },
      },
      outputs: {
        tabToggle: { type: 'AccordionTabToggle', doc: 'A tab of this accordion (never a nested one\'s) opened or closed.' },
      },
      methods: { type: 'AccordionMethods', fields: { closeAll: { doc: 'Close every open tab, and every accordion nested inside them.' } } },
    },
    'accordion-tab': {
      core: 'accordionTabCore',
      doc: [
        'One tab of an accordion: a `<details>` whose `header` slot is the summary and whose content is',
        'the body. `open` is two-way.',
      ].join('\n'),
      inputs: {
        type: 'AccordionTabInputs',
        fields: {
          open: { default: 'false', model: true, reflect: true },
          disabled: { default: 'false', reflect: true },
        },
      },
      methods: {
        type: 'AccordionTabMethods',
        fields: { setOpen: { doc: 'Open or close the tab through its `<details>`, so exclusivity and the nested collapse apply.' } },
      },
    },
  },
} satisfies ComponentGroup;
