import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The breadcrumb's manifest (#458 M5): `bs-breadcrumb` / `bs-breadcrumb-item`
 * (Angular), `BsBreadcrumb` / `BsBreadcrumbItem` (React, Vue) and
 * `mp-breadcrumb` / `mp-breadcrumb-item` (Lit).
 */
export default {
  group: 'breadcrumb',
  style: { scope: 'breadcrumb', bootstrap: ['breadcrumb'] },
  components: {
    breadcrumb: {
      core: 'breadcrumbCore',
      doc: "Bootstrap's breadcrumb: a `<nav>` landmark named by `label` around an ordered list of `breadcrumb-item`s.",
      inputs: {
        type: 'BreadcrumbInputs',
        fields: {
          label: { default: "'Breadcrumb'", kind: 'string' },
        },
      },
    },
    'breadcrumb-item': {
      core: 'breadcrumbItemCore',
      doc: 'One step of a breadcrumb: put a link in it, or plain text for the `active` (current) page.',
      inputs: {
        type: 'BreadcrumbItemInputs',
        fields: {
          active: { default: 'false', reflect: true },
        },
      },
    },
  },
} satisfies ComponentGroup;
