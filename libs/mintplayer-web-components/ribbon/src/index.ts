// Event-detail types
export type { RibbonTabChangeEvent } from './types/ribbon.types';
export type { RibbonGroupSize, RibbonReduceStep } from './mp-ribbon-tab.element';

// Item-shaped option types (consumed by the Angular wrappers)
export type { RibbonComboBoxOption } from './items/mp-ribbon-combobox.element';
export type { RibbonGroupButtonOption } from './items/mp-ribbon-group-button.element';

// Top-level shell + structural elements
export { MpRibbon } from './mp-ribbon.element';
export { MpQuickAccessToolbar } from './mp-quick-access-toolbar.element';
export { MpRibbonTab } from './mp-ribbon-tab.element';
export { MpRibbonContextualTabSet } from './mp-ribbon-contextual-tab-set.element';
export { MpRibbonGroup } from './mp-ribbon-group.element';

// All 14 item-type elements + the shared base class
export * from './items';
