import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The dropdown's manifest (#458 M6, PRD §4.5): the `[bsDropdown]` overlay
 * directive on a trigger, the panel it renders into a body host, and the menu
 * parts (`dropdown-menu`, `dropdown-item`, `dropdown-header`,
 * `dropdown-divider`), which also work in place without a trigger.
 *
 * - Angular: `<button>Menu<ng-container *bsDropdown><bs-dropdown-menu>…</bs-dropdown-menu></ng-container></button>`
 *   (inputs in microsyntax: `*bsDropdown="'bottom-end'; sameWidth: true; hasPopup: 'dialog'"`)
 * - React: `const [props, dropdown] = useBsDropdown({ content: <BsDropdownMenu>…</BsDropdownMenu> })`
 * - Vue: `<BsDropdown><template #default="{ props }"><button v-bind="props">Menu</button></template><template #content>…</template></BsDropdown>`
 * - Lit: `html\`<button ${bsDropdown({}, () => html\`<mp-dropdown-menu>…</mp-dropdown-menu>\`)}>Menu</button>\``
 */
export default {
  group: 'dropdown',
  style: { scope: 'dropdown', bootstrap: ['dropdown'] },
  components: {
    'dropdown-panel': {
      core: 'dropdownPanelCore',
      provides: 'DROPDOWN_NESTING',
      doc: "The dropdown's positioned panel, as the dropdown directive renders it; not used on its own.",
      inputs: {
        type: 'DropdownPanelInputs',
        fields: {
          overlayId: { default: "''", kind: 'string', doc: "The panel's id, which the trigger's `aria-controls` names." },
          side: { default: "'bottom'", kind: 'string' },
          shown: { default: 'false' },
          hasPopup: { default: "'menu'", kind: 'string' },
          triggerId: { default: 'null', kind: 'string', doc: "The trigger's id, naming a dialog panel." },
        },
      },
    },
    'dropdown-menu': {
      core: 'dropdownMenuCore',
      provides: 'DROPDOWN_NESTING',
      doc: [
        "Bootstrap's dropdown menu: an APG menu over its `dropdown-item`s (roving focus, arrow keys, Home / End,",
        'type-ahead free). Inside a dropdown its trigger names it; on its own give it a `label`.',
        'In a navbar nav group it is the navbar dropdown instead: a native `<details>` disclosure with `label` as',
        'its trigger text (or the `labelTemplate` slot), and a nested menu is a submenu.',
      ].join('\n'),
      inputs: {
        type: 'DropdownMenuInputs',
        fields: {
          maxHeight: { default: 'null', kind: 'number', doc: 'Pixel cap on the height; the menu scrolls beyond.' },
          label: { default: 'null', kind: 'string', doc: "The menu's accessible name, when no trigger names it; in a navbar, the trigger text." },
          active: { default: 'false', reflect: true, doc: "In a navbar: a descendant link's route is active." },
        },
      },
      outputs: {
        itemSelect: { type: 'DropdownSelectEventDetail', doc: 'An enabled item was activated: the item and its `value`.' },
      },
    },
    'dropdown-item': {
      core: 'dropdownItemCore',
      doc: 'A menu item: its content, or the link or button it wraps, is the menuitem.',
      inputs: {
        type: 'DropdownItemInputs',
        fields: {
          active: { default: 'false' },
          disabled: { default: 'false' },
          value: { default: 'undefined', kind: false, doc: "Opaque value reported in the menu's `select`." },
        },
      },
    },
    'dropdown-header': {
      core: 'dropdownHeaderCore',
      doc: 'A heading between menu items.',
    },
    'dropdown-divider': {
      core: 'dropdownDividerCore',
      doc: 'A separator between menu items.',
    },
  },
  directives: {
    dropdown: {
      core: 'dropdownCore',
      overlay: 'dropdown-panel',
      doc: [
        'A dropdown on the element (an APG menu button): a click toggles the panel, ArrowDown / ArrowUp open it on',
        'the first / last item. Escape, a press outside it, focus leaving it or activating an item closes it.',
      ].join('\n'),
      inputs: {
        type: 'DropdownInputs',
        fields: {
          placement: { default: "'bottom-start'", kind: 'string', alias: 'bsDropdown', doc: 'Where the panel sits; it flips vertically when it does not fit.' },
          sameWidth: { default: 'false', alias: 'bsDropdownSameWidth', doc: 'The panel is as wide as the trigger.' },
          hasPopup: { default: "'menu'", kind: 'string', alias: 'bsDropdownHasPopup', doc: '`menu`, or `dialog` for content that is not a menu (focus moves to the panel).' },
        },
      },
      names: { selector: '[bsDropdown]' },
    },
  },
} satisfies ComponentGroup;
