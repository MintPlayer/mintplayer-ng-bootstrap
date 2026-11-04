import type { ComponentGroup } from '@mintplayer/ui-core/component';

const span = (breakpoint: string) => ({
  kind: 'number' as const,
  doc: breakpoint === 'xxs' ? 'The column span (1–12) at every width: `col-N`.' : `The column span (1–12) from the \`${breakpoint}\` breakpoint up: \`col-${breakpoint}-N\`.`,
});

/**
 * The grid group's manifest (#458): directives only, placed on elements the
 * consumer renders. Each stamps its element with the `grid` scope and installs
 * the container and grid parts, so the consumer's rows and columns are styled
 * by the import alone.
 */
export default {
  group: 'grid',
  style: { scope: 'grid', bootstrap: ['containers', 'grid'] },
  components: {
    grid: {
      core: 'gridCore',
      doc: "Bootstrap's container around the page's rows: full width below `stopFullWidthAt`, fixed widths from it up (`never`: always full width).",
      inputs: {
        type: 'GridInputs',
        fields: {
          stopFullWidthAt: { default: "'sm'", kind: 'string' },
        },
      },
    },
  },
  directives: {
    row: {
      core: 'gridRowCore',
      doc: "Bootstrap's `.row` on the element.",
      names: { angular: 'BsGridRowDirective', selector: '[bsRow]' },
    },
    col: {
      core: 'gridColCore',
      doc: "Bootstrap's auto-width `.col` on the element.",
      names: { angular: 'BsGridColDirective', selector: '[col]' },
    },
    column: {
      core: 'gridColumnCore',
      doc: 'A column with a span per breakpoint: `<div md="6" lg="4">`.',
      inputs: {
        type: 'GridColumnInputs',
        fields: Object.fromEntries(['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'].map((breakpoint) => [breakpoint, span(breakpoint)])),
      },
      names: { angular: 'BsGridColumnDirective', selector: '[xxs],[xs],[sm],[md],[lg],[xl],[xxl]' },
    },
  },
} satisfies ComponentGroup;
