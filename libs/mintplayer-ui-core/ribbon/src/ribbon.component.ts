import type { ComponentGroup, ComponentManifest } from '@mintplayer/ui-core/component';

/** Inputs every command item takes. */
const ITEM = {
  itemId: { default: "''", kind: 'string' },
  label: { default: "''", kind: 'string' },
  icon: { default: "''", kind: 'string', doc: 'Text or an emoji; the `icon` slot takes rich content instead.' },
  size: { default: "'medium'", kind: 'string', doc: 'The declared size; a group the reflow sized down renders it smaller.' },
  disabled: { default: 'false', kind: 'boolean' },
  tooltip: { default: "''", kind: 'string' },
  keyTip: { default: 'null', kind: 'string', doc: 'The KeyTip letter(s); default: allocated from the label.' },
} as const;

const item = (core: string, type: string, doc: string, extra: Partial<ComponentManifest> = {}, fields: Record<string, object> = {}): ComponentManifest => ({
  core,
  doc,
  inputs: { type, fields: { ...ITEM, ...fields } },
  ...extra,
});

/**
 * The ribbon's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates the Angular, React, Vue and Lit fronts of every element from it,
 * the cores in `ribbon.core.ts` and the templates in `templates/`.
 *
 * The ribbon reads its tabs (and their contextual sets) from its content
 * through the `tabs` content query, so the tab strip renders on the server.
 */
export default {
  group: 'ribbon',
  style: { scope: 'ribbon' },
  components: {
    ribbon: {
      core: 'ribbonCore',
      provides: 'RIBBON_CONTEXT',
      doc: [
        'An Office-style ribbon (#437): tabs of groups of commands, with contextual tab sets, KeyTips (Alt),',
        'minimize (double-click a tab, Ctrl+F1), and a reflow that collapses groups as the width shrinks.',
        'Declare `ribbon-tab`s (optionally in `ribbon-contextual-tab-set`s) as content. `activeTabId` and',
        '`minimized` are two-way. Strings come from `labels`.',
      ].join('\n'),
      inputs: {
        type: 'RibbonInputs',
        fields: {
          activeTabId: { default: "''", kind: 'string', model: true },
          layout: { default: "'classic'", kind: 'string', doc: '`simplified`: one row of small items and an overflow menu.' },
          minimized: { default: 'false', kind: 'boolean', model: true },
          version: { default: "'office-2016'", kind: 'string' },
          colorScheme: { default: "'auto'", kind: 'string' },
          touchMode: { default: "'auto'", kind: 'string' },
          keyTips: { default: "'on'", kind: 'string', doc: '`off` leaves Alt alone.' },
          labels: { default: 'null', kind: false },
        },
      },
      content: { tabs: { component: 'ribbon-tab', within: 'ribbon-contextual-tab-set' } },
      outputs: {
        activeTabIdChange: { type: 'string', doc: 'The user selected a tab.' },
        minimizedChange: { type: 'boolean', doc: 'The user minimized or restored the ribbon.' },
        tabChange: { type: 'RibbonTabChangeEventDetail', doc: 'The user selected a tab: the previous and the new id.' },
      },
    },
    'ribbon-contextual-tab-set': {
      core: 'ribbonContextualTabSetCore',
      doc: 'A run of tabs under a coloured band, shown only while `visible` (a selection-dependent tool set).',
      inputs: {
        type: 'RibbonContextualTabSetInputs',
        fields: {
          label: { default: "''", kind: 'string' },
          color: { default: "'#F0AF84'", kind: 'string' },
          visible: { default: 'true', kind: 'boolean' },
        },
      },
    },
    'ribbon-tab': {
      core: 'ribbonTabCore',
      provides: 'RIBBON_CONTEXT',
      doc: 'One tab of the ribbon: its label in the strip, its groups in its panel.',
      inputs: {
        type: 'RibbonTabInputs',
        fields: {
          tabId: { default: "''", kind: 'string' },
          label: { default: "''", kind: 'string' },
          idealSizes: { default: 'null', kind: false, doc: 'Starting size per group id.' },
          reduceOrder: { default: 'null', kind: false, doc: '`[groupId, size]` steps walked as the width shrinks.' },
          keyTip: { default: 'null', kind: 'string' },
        },
      },
    },
    'ribbon-group': {
      core: 'ribbonGroupCore',
      doc: 'A labelled toolbar of commands; collapsed to a popup behind a button when the tab runs out of width.',
      inputs: {
        type: 'RibbonGroupInputs',
        fields: {
          groupId: { default: "''", kind: 'string' },
          label: { default: "''", kind: 'string' },
          icon: { default: "''", kind: 'string' },
          dialogLauncher: { default: "''", kind: 'string', doc: 'The dialog launcher\'s label; no launcher when empty.' },
          priority: { default: '0', kind: 'number', doc: 'Higher collapses later.' },
          autoScale: { default: 'true', kind: 'boolean', doc: 'False keeps the group at its size.' },
          keyTip: { default: 'null', kind: 'string' },
        },
      },
      outputs: {
        dialogLauncherClick: { type: 'RibbonDialogLauncherClickEventDetail', doc: 'The dialog launcher was activated.' },
      },
    },
    'quick-access-toolbar': {
      core: 'quickAccessToolbarCore',
      doc: 'A toolbar of frequent commands beside the ribbon; an `aria-label` names it.',
      inputs: {
        type: 'RibbonQuickAccessToolbarInputs',
        fields: { touchMode: { default: "'auto'", kind: 'string' } },
      },
    },
    'ribbon-button': item('ribbonButtonCore', 'RibbonItemInputs', 'A command button.', {
      outputs: { itemClick: { type: 'RibbonItemClickEventDetail', doc: 'The button was activated.' } },
    }),
    'ribbon-toggle-button': item(
      'ribbonToggleButtonCore',
      'RibbonToggleButtonInputs',
      'A button that stays pressed; `pressed` is two-way.',
      { outputs: { pressedChange: { type: 'boolean', doc: 'The user pressed or released it.' } } },
      { pressed: { default: 'false', kind: 'boolean', model: true } },
    ),
    'ribbon-check-box': item(
      'ribbonCheckBoxCore',
      'RibbonCheckBoxInputs',
      'A labelled checkbox; `checked` is two-way.',
      { outputs: { checkedChange: { type: 'boolean', doc: 'The user checked or cleared it.' } }, names: { lit: 'MpRibbonCheckbox', tag: 'mp-ribbon-checkbox' } },
      { checked: { default: 'false', kind: 'boolean', model: true } },
    ),
    'ribbon-combo-box': item(
      'ribbonComboBoxCore',
      'RibbonComboBoxInputs',
      'A select of `options`; `value` is two-way.',
      { outputs: { valueChange: { type: 'string', doc: 'The user picked an option.' } }, names: { lit: 'MpRibbonCombobox', tag: 'mp-ribbon-combobox' } },
      { value: { default: "''", kind: 'string', model: true }, options: { default: '[]', kind: false } },
    ),
    'ribbon-color-picker': item(
      'ribbonColorPickerCore',
      'RibbonColorPickerInputs',
      'A colour input; `color` is two-way.',
      { outputs: { colorChange: { type: 'string', doc: 'The user picked a colour.' } } },
      { color: { default: "'#000000'", kind: 'string', model: true } },
    ),
    'ribbon-group-button': item(
      'ribbonGroupButtonCore',
      'RibbonGroupButtonInputs',
      'A radio group of `buttons`; `selectedValue` is two-way.',
      { outputs: { selectedValueChange: { type: 'string', doc: 'The user picked a button.' } } },
      { selectedValue: { default: "''", kind: 'string', model: true }, buttons: { default: '[]', kind: false } },
    ),
    'ribbon-split-button': item('ribbonSplitButtonCore', 'RibbonItemInputs', 'A command button with a menu (its content) behind a chevron.', {
      outputs: {
        mainAction: { type: 'RibbonItemClickEventDetail', doc: 'The main part was activated.' },
        itemClick: { type: 'RibbonItemClickEventDetail', doc: 'The main part was activated.' },
        menuToggle: { type: 'RibbonMenuToggleEventDetail', doc: 'The menu opened or closed.' },
      },
    }),
    'ribbon-dropdown-button': item('ribbonDropdownButtonCore', 'RibbonItemInputs', 'A button that opens a menu (its content).', {
      outputs: { menuToggle: { type: 'RibbonMenuToggleEventDetail', doc: 'The menu opened or closed.' } },
    }),
    'ribbon-menu-item': {
      core: 'ribbonMenuItemCore',
      doc: 'An entry of a dropdown or split button menu: an action, a checkbox or a radio (`kind`).',
      inputs: {
        type: 'RibbonMenuItemInputs',
        fields: {
          itemId: { default: "''", kind: 'string' },
          label: { default: "''", kind: 'string' },
          icon: { default: "''", kind: 'string' },
          kind: { default: "'action'", kind: 'string' },
          checked: { default: 'false', kind: 'boolean', model: true },
          disabled: { default: 'false', kind: 'boolean' },
        },
      },
      outputs: {
        checkedChange: { type: 'boolean', doc: 'A checkbox or radio entry changed.' },
        menuSelect: { type: 'RibbonMenuSelectEventDetail', doc: 'The entry was activated.' },
      },
    },
    'ribbon-menu-separator': {
      core: 'ribbonMenuSeparatorCore',
      doc: 'A rule between menu entries.',
    },
    'ribbon-gallery': item('ribbonGalleryCore', 'RibbonGalleryInputs', 'A grid of `ribbon-gallery-item`s (its content).', {}, { columns: { default: '4', kind: 'number' } }),
    'ribbon-gallery-item': {
      core: 'ribbonGalleryItemCore',
      doc: 'One choice in a gallery.',
      inputs: {
        type: 'RibbonGalleryItemInputs',
        fields: {
          itemId: { default: "''", kind: 'string' },
          label: { default: "''", kind: 'string' },
          icon: { default: "''", kind: 'string' },
          selected: { default: 'false', kind: 'boolean' },
          disabled: { default: 'false', kind: 'boolean' },
        },
      },
      outputs: { gallerySelect: { type: 'RibbonItemClickEventDetail', doc: 'The choice was activated.' } },
    },
    'ribbon-template-item': {
      core: 'ribbonTemplateItemCore',
      doc: 'Any content of your own, sized like an item.',
      inputs: { type: 'RibbonTemplateItemInputs', fields: { size: { default: "'medium'", kind: 'string' } } },
    },
  },
} satisfies ComponentGroup;
