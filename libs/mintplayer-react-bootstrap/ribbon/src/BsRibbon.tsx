import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
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

// Top-level shell + structural elements

export const BsRibbon = createComponent({
  react: React,
  tagName: 'mp-ribbon',
  elementClass: MpRibbon,
  events: {
    onTabChange: 'tab-change' as EventName<CustomEvent<RibbonTabChangeEvent>>,
    onMinimizeToggle: 'minimize-toggle' as EventName<CustomEvent<{ minimized: boolean }>>,
  },
});

export const BsQuickAccessToolbar = createComponent({
  react: React,
  tagName: 'mp-quick-access-toolbar',
  elementClass: MpQuickAccessToolbar,
});

export const BsRibbonTab = createComponent({
  react: React,
  tagName: 'mp-ribbon-tab',
  elementClass: MpRibbonTab,
});

export const BsRibbonContextualTabSet = createComponent({
  react: React,
  tagName: 'mp-ribbon-contextual-tab-set',
  elementClass: MpRibbonContextualTabSet,
  events: {
    onContextualVisibilityChange: 'contextual-visibility-change' as EventName<
      CustomEvent<{ hidden: boolean; label?: string; color?: string }>
    >,
  },
});

export const BsRibbonGroup = createComponent({
  react: React,
  tagName: 'mp-ribbon-group',
  elementClass: MpRibbonGroup,
  events: {
    onDialogLauncherClick: 'dialog-launcher-click' as EventName<CustomEvent<{ groupId?: string }>>,
  },
});

// Item-type elements — every item dispatches `item-click` via the shared
// MpRibbonItemBase. Specific items add more events on top of that.

interface ItemClickDetail { itemId?: string; }

export const BsRibbonButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-button',
  elementClass: MpRibbonButton,
  events: {
    onItemClick: 'item-click' as EventName<CustomEvent<ItemClickDetail>>,
  },
});

export const BsRibbonSplitButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-split-button',
  elementClass: MpRibbonSplitButton,
  events: {
    onMainAction: 'main-action' as EventName<CustomEvent<ItemClickDetail>>,
    onItemClick: 'item-click' as EventName<CustomEvent<ItemClickDetail>>,
    onMenuToggle: 'menu-toggle' as EventName<CustomEvent<{ itemId?: string; open: boolean }>>,
  },
});

export const BsRibbonDropdownButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-dropdown-button',
  elementClass: MpRibbonDropdownButton,
  events: {
    onMenuToggle: 'menu-toggle' as EventName<CustomEvent<{ itemId?: string; open: boolean }>>,
  },
});

export const BsRibbonMenuItem = createComponent({
  react: React,
  tagName: 'mp-ribbon-menu-item',
  elementClass: MpRibbonMenuItem,
  events: {
    onMenuSelect: 'menu-select' as EventName<CustomEvent<ItemClickDetail>>,
  },
});

export const BsRibbonMenuSeparator = createComponent({
  react: React,
  tagName: 'mp-ribbon-menu-separator',
  elementClass: MpRibbonMenuSeparator,
});

export const BsRibbonToggleButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-toggle-button',
  elementClass: MpRibbonToggleButton,
  events: {
    onToggle: 'toggle' as EventName<CustomEvent<{ itemId?: string; pressed: boolean }>>,
  },
});

export const BsRibbonCheckBox = createComponent({
  react: React,
  tagName: 'mp-ribbon-checkbox',
  elementClass: MpRibbonCheckBox,
  events: {
    onCheckChange: 'check-change' as EventName<CustomEvent<{ itemId?: string; checked: boolean }>>,
  },
});

export const BsRibbonComboBox = createComponent({
  react: React,
  tagName: 'mp-ribbon-combobox',
  elementClass: MpRibbonComboBox,
  events: {
    onValueChange: 'value-change' as EventName<CustomEvent<{ itemId?: string; value: unknown }>>,
  },
});

export const BsRibbonColorPicker = createComponent({
  react: React,
  tagName: 'mp-ribbon-color-picker',
  elementClass: MpRibbonColorPicker,
  events: {
    onColorChange: 'color-change' as EventName<CustomEvent<{ itemId?: string; color: string }>>,
  },
});

export const BsRibbonGroupButton = createComponent({
  react: React,
  tagName: 'mp-ribbon-group-button',
  elementClass: MpRibbonGroupButton,
  events: {
    onGroupSelect: 'group-select' as EventName<CustomEvent<{ itemId?: string; value: unknown }>>,
  },
});

export const BsRibbonGallery = createComponent({
  react: React,
  tagName: 'mp-ribbon-gallery',
  elementClass: MpRibbonGallery,
});

export const BsRibbonGalleryItem = createComponent({
  react: React,
  tagName: 'mp-ribbon-gallery-item',
  elementClass: MpRibbonGalleryItem,
  events: {
    onGallerySelect: 'gallery-select' as EventName<CustomEvent<ItemClickDetail>>,
  },
});

export const BsRibbonTemplateItem = createComponent({
  react: React,
  tagName: 'mp-ribbon-template-item',
  elementClass: MpRibbonTemplateItem,
});
