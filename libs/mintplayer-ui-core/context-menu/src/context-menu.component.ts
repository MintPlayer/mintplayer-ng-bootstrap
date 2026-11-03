import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The context menu's manifest (#458 M6): the `[bsContextMenu]` overlay
 * directive and the panel it renders at the pointer. The content is usually
 * a `dropdown-menu` (the dropdown group).
 *
 * - Angular: `<div tabindex="0">…<ng-template bsContextMenu><bs-dropdown-menu>…</bs-dropdown-menu></ng-template></div>`
 * - React: `const [props, menu] = useBsContextMenu({ content: <BsDropdownMenu>…</BsDropdownMenu> })`
 * - Vue: `<BsContextMenu v-slot="{ props }"><div v-bind="props">…</div><template #content>…</template></BsContextMenu>`
 * - Lit: `html\`<div ${bsContextMenu({}, () => html\`<mp-dropdown-menu>…</mp-dropdown-menu>\`)}>…</div>\``
 */
export default {
  group: 'context-menu',
  style: { scope: 'context-menu' },
  components: {
    'context-menu-panel': {
      core: 'contextMenuPanelCore',
      doc: "The context menu's positioned panel, as the context-menu directive renders it; not used on its own.",
      inputs: {
        type: 'ContextMenuPanelInputs',
        fields: {
          overlayId: { default: "''", kind: 'string', doc: "The panel's id." },
          shown: { default: 'false' },
        },
      },
    },
  },
  directives: {
    'context-menu': {
      core: 'contextMenuCore',
      overlay: 'context-menu-panel',
      doc: [
        "A custom context menu on the element: a right-click, Shift+F10 or the ContextMenu key opens it instead of the",
        "browser's. Escape, a press elsewhere, scrolling or choosing an item closes it.",
      ].join('\n'),
      inputs: {
        type: 'ContextMenuInputs',
        fields: {
          label: { default: "'Context menu'", kind: 'string', doc: "The menu's accessible name, when the content does not name it." },
          disabled: { default: 'false', doc: "Leave the browser's context menu alone." },
        },
      },
      names: { selector: '[bsContextMenu]' },
    },
  },
} satisfies ComponentGroup;
