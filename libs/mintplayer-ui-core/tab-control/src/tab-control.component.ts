import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The tab control's manifest (#458 M4): `@mintplayer/nx-component-compiler`
 * generates `bs-tab-control` / `bs-tab-page` (Angular), `BsTabControl` /
 * `BsTabPage` (React, Vue) and `mp-tab-control` / `mp-tab-page` (Lit) from it,
 * the core in `tab-control.core.ts` and the template in `templates/`.
 */
export default {
  group: 'tab-control',
  style: { scope: 'tab-control', bootstrap: ['nav'] },
  components: {
    'tab-control': {
      core: 'tabControlCore',
      doc: [
        'Bootstrap nav-tabs over one native radio per page (#458). `activeTab` is two-way: the shown',
        'page\'s `tabId`, or its position.',
        '',
        'The server-rendered page is a working tab control with JavaScript off: the checked radio shows',
        'its pane through CSS. Once hydrated the labels become APG tabs (roving tabindex, automatic',
        'activation; Left/Right, Home/End) and the radios leave the tab order.',
      ].join('\n'),
      inputs: {
        type: 'TabControlInputs',
        fields: {
          activeTab: { default: 'null', kind: 'string', model: true },
          border: { default: 'true' },
          selectFirstTab: { default: 'true' },
          tabsPosition: { default: "'top'", kind: 'string', reflect: true },
        },
      },
      content: {
        pages: { component: 'tab-page' },
      },
    },
  },
  declarations: {
    'tab-page': {
      doc: 'One page of a tab control. Its `header` slot fills the tab, its content the pane.',
      inputs: {
        type: 'TabPageInputs',
        fields: {
          tabId: { default: 'null', kind: 'string' },
          disabled: { default: 'false' },
        },
      },
      slots: {
        header: { doc: 'The tab\'s content: any markup, not just text.' },
      },
    },
  },
} satisfies ComponentGroup;
