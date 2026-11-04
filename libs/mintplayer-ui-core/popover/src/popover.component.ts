import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The popover's manifest (#458 M6): an overlay directive on the trigger and the
 * non-modal dialog it renders into a body host.
 *
 * - Angular: `<button>Info<ng-container *bsPopover="'top'; title: 'Title'">Body</ng-container></button>`
 * - React: `const [props, popover] = useBsPopover({ position: 'top', title: 'Title', content: 'Body' })`
 * - Vue: `<BsPopover position="top" title="Title"><template #default="{ props }"><button v-bind="props">Info</button></template><template #content>Body</template></BsPopover>`
 * - Lit: `html\`<button ${bsPopover({ position: 'top', title: 'Title' }, () => 'Body')}>Info</button>\``
 */
export default {
  group: 'popover',
  style: { scope: 'popover', bootstrap: ['popover', 'transitions'] },
  components: {
    'popover-panel': {
      core: 'popoverPanelCore',
      doc: "Bootstrap's popover panel, as the popover directive renders it; not used on its own.",
      inputs: {
        type: 'PopoverPanelInputs',
        fields: {
          overlayId: { default: "''", kind: 'string', doc: "The panel's id, which the trigger's `aria-controls` names." },
          side: { default: "'bottom'", kind: 'string' },
          shown: { default: 'false' },
          heading: { default: 'null', kind: 'string' },
          triggerId: { default: 'null', kind: 'string', doc: "The trigger's id, naming the dialog when there is no title." },
        },
      },
    },
  },
  directives: {
    popover: {
      core: 'popoverCore',
      overlay: 'popover-panel',
      doc: [
        'A popover on the element: a click (or Enter / Space) toggles a non-modal dialog beside it. Escape, a press',
        'outside it or focus leaving it closes it.',
      ].join('\n'),
      inputs: {
        type: 'PopoverInputs',
        fields: {
          position: { default: "'bottom'", kind: 'string', alias: 'bsPopover', doc: 'The side of the element it shows on; it flips when it does not fit.' },
          title: { default: 'null', kind: 'string', alias: 'bsPopoverTitle', doc: 'The heading; it names the dialog.' },
        },
      },
      names: { selector: '[bsPopover]' },
    },
  },
} satisfies ComponentGroup;
