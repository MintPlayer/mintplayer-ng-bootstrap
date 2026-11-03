import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The tooltip's manifest (#458 M6): an overlay directive on the trigger and the
 * panel it renders into a body host.
 *
 * - Angular: `<button>Save<span *bsTooltip="'top'">Saves the draft</span></button>`
 * - React: `const [props, tooltip] = useBsTooltip({ position: 'top', content: 'Saves the draft' })`
 * - Vue: `<BsTooltip position="top" v-slot="{ props }"><button v-bind="props">Save</button><template #content>…</template></BsTooltip>`
 * - Lit: `html\`<button ${bsTooltip({ position: 'top' }, () => 'Saves the draft')}>Save</button>\``
 */
export default {
  group: 'tooltip',
  style: { scope: 'tooltip', bootstrap: ['tooltip', 'transitions'] },
  components: {
    'tooltip-panel': {
      core: 'tooltipPanelCore',
      doc: "Bootstrap's tooltip panel, as the tooltip directive renders it; not used on its own.",
      inputs: {
        type: 'TooltipPanelInputs',
        fields: {
          overlayId: { default: "''", kind: 'string', doc: "The panel's id, which the trigger's `aria-describedby` names." },
          side: { default: "'top'", kind: 'string' },
          shown: { default: 'false' },
        },
      },
    },
  },
  directives: {
    tooltip: {
      core: 'tooltipCore',
      overlay: 'tooltip-panel',
      doc: [
        'A tooltip on the element: shown on hover and on focus, dismissed by Escape, hoverable (WCAG 1.4.13).',
        'While it shows, the element\'s `aria-describedby` names it.',
      ].join('\n'),
      inputs: {
        type: 'TooltipInputs',
        fields: {
          position: { default: "'top'", kind: 'string', alias: 'bsTooltip', doc: 'The side of the element it shows on; it flips when it does not fit.' },
        },
      },
      names: { selector: '[bsTooltip]' },
    },
  },
} satisfies ComponentGroup;
