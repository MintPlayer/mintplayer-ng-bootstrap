import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The table's manifest (#458 M5): `bs-table` (Angular), `BsTable` (React,
 * Vue) and `mp-table` (Lit).
 */
export default {
  group: 'table',
  style: { scope: 'table', bootstrap: ['tables'] },
  components: {
    table: {
      core: 'tableCore',
      doc: [
        "Bootstrap's table: a real `<table>` around the consumer's rows. `responsive` scrolls inline instead of",
        'wrapping; the consumer\'s `aria-*` (such as `aria-rowcount`) land on the `<table>`.',
      ].join('\n'),
      inputs: {
        type: 'TableInputs',
        fields: {
          responsive: { default: 'false' },
          striped: { default: 'false' },
          hover: { default: 'false' },
          bordered: { default: 'false' },
        },
      },
    },
  },
} satisfies ComponentGroup;
