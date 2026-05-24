// The ribbon WC family is structural — most consumers compose it as a
// template tree (mp-ribbon → mp-ribbon-tab → mp-ribbon-group → items)
// and only listen on the top-level ribbon for tab/minimize events.
//
// Rather than ship 18 separate .vue SFCs (one per element type), this
// barrel exposes:
//
// - A typed `BsRibbon.vue` SFC for the top-level shell, which carries
//   the `:tabs` / `:active-tab-id` / `:minimized` v-model surface plus
//   the `tab-change` / `minimize-toggle` event mapping.
// - Element-class re-exports from `@mintplayer/web-components/ribbon`
//   so Vue templates can reference `<mp-ribbon-tab>`, `<mp-ribbon-group>`,
//   `<mp-ribbon-button>` etc. directly (they're plain custom elements;
//   Vue's compiler treats unknown kebab-case tags as native).
//
// Item-event listeners (`@check-change`, `@toggle`, etc.) attach directly
// to the native custom elements in the consumer template — no SFC
// indirection needed.
//
// Side-effect-registers all the ribbon elements via the upstream entry.
import '@mintplayer/web-components/ribbon';

export { default as BsRibbon } from './BsRibbon.vue';

// Element classes (re-exported for typed consumers — `ref<MpRibbonGroup>()` etc.)
export {
  MpRibbon,
  MpQuickAccessToolbar,
  MpRibbonTab,
  MpRibbonContextualTabSet,
  MpRibbonGroup,
  MpRibbonButton,
  MpRibbonSplitButton,
  MpRibbonDropdownButton,
  MpRibbonMenuItem,
  MpRibbonMenuSeparator,
  MpRibbonToggleButton,
  MpRibbonCheckBox,
  MpRibbonComboBox,
  MpRibbonColorPicker,
  MpRibbonGroupButton,
  MpRibbonGallery,
  MpRibbonGalleryItem,
  MpRibbonTemplateItem,
  type RibbonTabChangeEvent,
} from '@mintplayer/web-components/ribbon';
