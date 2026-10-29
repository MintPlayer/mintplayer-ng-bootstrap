import { contentFlag, defineContext, type ContentChild } from '@mintplayer/ui-core/component';
import { hydratedAttr } from '@mintplayer/ui-core/store';
import { bandTextColor } from './band-text-color';
import type { RibbonItemSize } from './plan-reduce-steps';

/**
 * The ribbon's pure half (PRD #437 D10): types, labels, ids, the context the
 * ribbon hands its tabs, groups and items, and the attribute bags the
 * templates render. Nothing here touches the DOM; `ribbon.core.ts` measures,
 * reflows, roves focus and drives the KeyTips.
 *
 * Sizing is a CSS contract, not a re-render: an item renders its DECLARED size
 * as `data-size`; its group root carries `data-ideal-size` (from the tab's
 * `idealSizes`, server-rendered) and, once the reflow measured it,
 * `data-resolved-size` (written by the core, never by a template). The sheet
 * derives every item's effective size from the three, so a reflow can try a
 * size and measure it in the same frame.
 */

export const RIBBON_SCOPE = 'ribbon';

export type RibbonBag = Record<string, string | number | boolean | null>;

export type { RibbonItemSize };
export type RibbonGroupSize = 'large' | 'medium' | 'small' | 'popup';
export type RibbonReduceStep = readonly [groupId: string, target: RibbonGroupSize];
export type RibbonLayout = 'classic' | 'simplified';
export type RibbonVersion = 'office-2007' | 'office-2010' | 'office-2013' | 'office-2016';
export type RibbonColorScheme = 'light' | 'dark' | 'auto';
export type RibbonTouchMode = 'on' | 'off' | 'auto';
export type RibbonMenuItemKind = 'action' | 'checkbox' | 'radio';

const part = (cls: string, extra: RibbonBag = {}): RibbonBag => ({ class: cls, ...extra });
const decorative = { 'aria-hidden': 'true' };

/** The static nodes of the family's templates: a bag each, so the scoped sheet reaches them. */
export const RIBBON_PARTS = {
  container: part('ribbon-container'),
  tabstrip: part('ribbon-tabstrip'),
  tellMe: part('ribbon-tell-me'),
  bandLabel: part('ribbon-contextual-group-band'),
  bandTabs: part('ribbon-contextual-group-tabs'),
  keyTip: part('keytip-badge', decorative),
  groups: part('ribbon-tabpanel-groups'),
  overflowIcon: part('overflow-entry-icon', decorative),
  overflowLabel: part('overflow-entry-label'),
  groupItems: part('ribbon-group-items'),
  groupFooter: part('ribbon-group-footer'),
  groupLabel: part('ribbon-group-label'),
  launcherIcon: part('ribbon-dialog-launcher-icon', decorative),
  triggerIcon: part('ribbon-popup-trigger-icon', decorative),
  triggerLabel: part('ribbon-popup-trigger-label'),
  chevron: part('ribbon-chevron', decorative),
  icon: part('ribbon-button-icon', decorative),
  label: part('ribbon-button-label'),
  fieldLabel: part('ribbon-field-label'),
  radioIcon: part('ribbon-group-button-icon', decorative),
  radioLabel: part('ribbon-group-button-label'),
  menuCheck: part('menu-item-check', decorative),
  menuIcon: part('menu-item-icon', decorative),
  menuLabel: part('menu-item-label'),
  galleryIcon: part('gallery-item-icon', decorative),
  galleryItems: part('ribbon-gallery-items'),
} as const;

export type RibbonParts = typeof RIBBON_PARTS;

/** A geometry custom-property record for `:style`. */
export type RibbonStyle = Record<string, string>;

/** Every string the ribbon family shows or speaks. `{label}` placeholders are filled in. */
export interface RibbonLabels {
  /** The region's name when the consumer gives no `aria-label`. */
  region: string;
  minimized: string;
  restored: string;
  groupCollapsed: string;
  groupExpanded: string;
  contextualShown: string;
  contextualHidden: string;
  /** The Simplified layout's overflow chevron. */
  moreCommands: string;
  /** The overflow chevron's menu. */
  overflowMenu: string;
  /** A split button's chevron: `{label}` is the button's label. */
  itemOptions: string;
  /** The quick access toolbar's name when the consumer gives none. */
  quickAccessToolbar: string;
}

export const RIBBON_LABELS: RibbonLabels = {
  region: 'Ribbon',
  minimized: 'Ribbon minimized',
  restored: 'Ribbon restored',
  groupCollapsed: '{label} group collapsed',
  groupExpanded: '{label} group expanded',
  contextualShown: '{label}, contextual, now available',
  contextualHidden: '{label}, contextual, hidden',
  moreCommands: 'More commands',
  overflowMenu: 'Overflow commands',
  itemOptions: '{label} options',
  quickAccessToolbar: 'Quick Access Toolbar',
};

export function ribbonLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function ribbonLabels(labels: Partial<RibbonLabels> | null | undefined): RibbonLabels {
  return labels ? { ...RIBBON_LABELS, ...labels } : RIBBON_LABELS;
}

const slug = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-') || 'tab';

export function ribbonTabButtonId(ribbonId: string, tabId: string): string {
  return `${ribbonId}-tab-${slug(tabId)}`;
}

export function ribbonPanelId(ribbonId: string, tabId: string): string {
  return `${ribbonId}-panel-${slug(tabId)}`;
}

// ---------------------------------------------------------------------------
// Context: the ribbon hands it down; a tab adds its ideal group sizes.

export interface RibbonContext {
  /** The ribbon's instance id: tab buttons and panels derive their ids from it. Null outside a ribbon. */
  readonly ribbonId: string | null;
  /** The tab whose panel shows (resolved: never a hidden contextual tab). */
  readonly activeTabId: string | null;
  readonly minimized: boolean;
  readonly layout: RibbonLayout;
  readonly labels: RibbonLabels;
  /** The enclosing tab's starting group sizes. */
  readonly idealSizes: Readonly<Record<string, RibbonGroupSize>> | null;
}

export const RIBBON_CONTEXT = defineContext<RibbonContext>('ribbon', {
  ribbonId: null,
  activeTabId: null,
  minimized: false,
  layout: 'classic',
  labels: RIBBON_LABELS,
  idealSizes: null,
});

// ---------------------------------------------------------------------------
// Inputs.

export interface RibbonTabInputs {
  tabId?: string;
  label?: string;
  /** Starting size per group id; a group not listed starts large. */
  idealSizes?: Readonly<Record<string, RibbonGroupSize>> | null;
  /** `[groupId, size]` steps walked on shrink (and back on grow); default: by group priority. */
  reduceOrder?: readonly RibbonReduceStep[] | null;
  /** The KeyTip letter(s); default: allocated from the label. */
  keyTip?: string | null;
}

export interface RibbonContextualTabSetInputs {
  label?: string;
  /** The band colour; its text colour is picked for contrast. */
  color?: string;
  /** False hides the set's tabs from the strip. */
  visible?: boolean;
}

export interface RibbonInputs {
  /** The selected tab; the first visible tab when empty or hidden. Two-way. */
  activeTabId?: string;
  layout?: RibbonLayout;
  /** Only the tab strip shows. Two-way; Ctrl+F1 and a tab double-click toggle it. */
  minimized?: boolean;
  version?: RibbonVersion;
  colorScheme?: RibbonColorScheme;
  touchMode?: RibbonTouchMode;
  /** `off` leaves Alt alone (an application with its own Alt menu). */
  keyTips?: 'on' | 'off';
  labels?: Partial<RibbonLabels> | null;
  /** The content query: the declared tabs (and their contextual sets). */
  tabs?: readonly ContentChild<RibbonTabInputs, RibbonContextualTabSetInputs>[];
}

/** Common to every command item. */
export interface RibbonItemInputs {
  itemId?: string;
  label?: string;
  /** Text or an emoji; the `icon` slot takes rich content instead. */
  icon?: string;
  /** The declared size; a group sized down by the reflow renders it smaller. */
  size?: RibbonItemSize;
  disabled?: boolean;
  tooltip?: string;
  keyTip?: string | null;
}

// ---------------------------------------------------------------------------
// Tab strip.

export interface RibbonTabEntry {
  readonly tabId: string;
  readonly label: string;
  readonly keyTip: string | null;
  readonly set: { readonly label: string; readonly color: string } | null;
}

const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : value == null ? fallback : String(value));

/** A contextual set is shown unless `visible` is false (`false`, `"false"`). */
function setVisible(value: unknown): boolean {
  return value === undefined || value === null || (value !== false && value !== 'false');
}

/** The strip's tabs, in content order, without the tabs of hidden contextual sets. */
export function ribbonTabEntries(content: RibbonInputs['tabs']): RibbonTabEntry[] {
  return (content ?? []).flatMap(({ inputs, within }) => {
    if (within && !setVisible(within.visible)) return [];
    const tabId = text(inputs.tabId);
    if (!tabId) return [];
    return [
      {
        tabId,
        label: text(inputs.label),
        keyTip: inputs.keyTip ? text(inputs.keyTip) : null,
        set: within ? { label: text(within.label), color: text(within.color, '#5BAEFF') || '#5BAEFF' } : null,
      },
    ];
  });
}

/** The visible contextual sets by label, for the shown/hidden announcement. */
export function ribbonContextualSets(content: RibbonInputs['tabs']): Map<string, boolean> {
  const sets = new Map<string, boolean>();
  (content ?? []).forEach(({ within }) => {
    if (within?.label) sets.set(text(within.label), setVisible(within.visible));
  });
  return sets;
}

/** The selected tab if it is shown, else the first shown tab. */
export function resolveActiveTab(entries: readonly RibbonTabEntry[], requested: string | null | undefined): string | null {
  if (requested && entries.some((entry) => entry.tabId === requested)) return requested;
  return entries[0]?.tabId ?? null;
}

export interface RibbonTabButtonView {
  readonly key: string;
  readonly label: string;
  readonly bag: RibbonBag;
}

/** A run of the strip: one plain tab, or the tabs of one contextual set under its band. */
export interface RibbonTabRunView {
  readonly key: string;
  readonly contextual: boolean;
  readonly label: string;
  readonly band: RibbonBag;
  /** The band colour and its contrasting text colour. */
  readonly bandStyle: RibbonStyle;
  readonly tabs: readonly RibbonTabButtonView[];
}

export interface RibbonView {
  readonly parts: RibbonParts;
  readonly root: RibbonBag;
  readonly tablist: RibbonBag;
  readonly runs: readonly RibbonTabRunView[];
  readonly content: RibbonBag;
  readonly keyTips: readonly { readonly key: string; readonly tip: string; readonly style: RibbonStyle }[];
  readonly live: RibbonBag;
  readonly announcement: string;
}

export interface RibbonKeyTipBadge {
  readonly tip: string;
  readonly left: number;
  readonly top: number;
}

export interface ConnectRibbonOptions {
  readonly id: string;
  readonly entries: readonly RibbonTabEntry[];
  readonly activeTabId: string | null;
  readonly minimized: boolean;
  readonly layout: RibbonLayout;
  readonly version: RibbonVersion;
  readonly colorScheme: RibbonColorScheme;
  readonly touchMode: RibbonTouchMode;
  readonly label: string | null;
  readonly labels: RibbonLabels;
  readonly hydrated: boolean;
  readonly keyTips: readonly RibbonKeyTipBadge[];
  readonly live: RibbonBag;
  readonly announcement: string;
}

function tabButton(o: ConnectRibbonOptions, entry: RibbonTabEntry): RibbonTabButtonView {
  const active = entry.tabId === o.activeTabId;
  return {
    key: entry.tabId,
    label: entry.label,
    bag: {
      type: 'button',
      role: 'tab',
      id: ribbonTabButtonId(o.id, entry.tabId),
      class: ['ribbon-tab', active ? 'active' : '', entry.set ? 'contextual' : ''].filter(Boolean).join(' '),
      'aria-selected': active ? 'true' : 'false',
      'aria-controls': ribbonPanelId(o.id, entry.tabId),
      tabindex: active ? 0 : -1,
      'data-ribbon-tab': entry.tabId,
      'data-key-tip': entry.keyTip,
      // A tab cannot switch panels before the core is live.
      disabled: o.hydrated ? null : true,
    },
  };
}

export function connectRibbon(o: ConnectRibbonOptions): RibbonView {
  const runs: RibbonTabRunView[] = [];
  o.entries.forEach((entry) => {
    const last = runs[runs.length - 1];
    const set = entry.set;
    if (set && last?.contextual && last.label === set.label && last.band['data-color'] === set.color) {
      (last.tabs as RibbonTabButtonView[]).push(tabButton(o, entry));
      return;
    }
    runs.push({
      key: set ? `set:${set.label}:${entry.tabId}` : `tab:${entry.tabId}`,
      contextual: !!set,
      label: set?.label ?? '',
      band: set ? { class: 'ribbon-contextual-group', 'data-color': set.color } : {},
      bandStyle: set ? { '--bs-ribbon-contextual-color': set.color, '--ribbon-contextual-text': bandTextColor(set.color) } : {},
      tabs: [tabButton(o, entry)],
    });
  });

  return {
    parts: RIBBON_PARTS,
    root: {
      class: 'ribbon',
      role: 'region',
      'aria-label': o.label || o.labels.region,
      'data-version': o.version,
      'data-color-scheme': o.colorScheme,
      'data-touch-mode': o.touchMode,
      'data-layout': o.layout,
      'data-minimized': o.minimized ? '' : null,
      ...hydratedAttr(o.hydrated),
    },
    tablist: { role: 'tablist', class: 'ribbon-tablist', 'aria-label': o.label || o.labels.region },
    runs,
    content: { class: 'ribbon-content', hidden: o.minimized ? true : null },
    keyTips: o.keyTips.map((badge, i) => ({ key: `${i}:${badge.tip}`, tip: badge.tip, style: { '--ribbon-keytip-left': `${badge.left}px`, '--ribbon-keytip-top': `${badge.top}px` } })),
    live: { ...{ role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, ...o.live, class: 'visually-hidden' },
    announcement: o.announcement,
  };
}

// ---------------------------------------------------------------------------
// Contextual tab set: transparent in the layout.

export function connectRibbonContextualTabSet(): RibbonBag {
  return { class: 'ribbon-contextual-tab-set' };
}

// ---------------------------------------------------------------------------
// Tab: its own tabpanel, and the Simplified layout's overflow menu.

export interface RibbonOverflowEntryView {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly bag: RibbonBag;
}

export interface RibbonTabView {
  readonly parts: RibbonParts;
  readonly panel: RibbonBag;
  readonly overflowTrigger: RibbonBag;
  readonly overflowMenu: RibbonBag;
  readonly overflowEntries: readonly RibbonOverflowEntryView[];
}

export interface RibbonOverflowEntry {
  readonly label: string;
  readonly icon: string;
}

export interface ConnectRibbonTabOptions {
  readonly id: string;
  readonly tabId: string;
  readonly context: RibbonContext;
  readonly overflow: readonly RibbonOverflowEntry[];
  readonly overflowOpen: boolean;
  readonly hydrated: boolean;
}

export function connectRibbonTab(o: ConnectRibbonTabOptions): RibbonTabView {
  const { ribbonId, activeTabId, minimized, labels } = o.context;
  const active = !!o.tabId && o.tabId === activeTabId;
  const menuId = `${o.id}-overflow`;
  return {
    parts: RIBBON_PARTS,
    panel: {
      class: 'ribbon-tabpanel',
      role: 'tabpanel',
      id: ribbonId && o.tabId ? ribbonPanelId(ribbonId, o.tabId) : null,
      'aria-labelledby': ribbonId && o.tabId ? ribbonTabButtonId(ribbonId, o.tabId) : null,
      'data-ribbon-panel': o.tabId,
      'data-active': active ? '' : null,
      'data-has-overflow': o.overflow.length ? '' : null,
      hidden: active && !minimized ? null : true,
    },
    overflowTrigger: {
      type: 'button',
      class: 'overflow-trigger',
      popovertarget: menuId,
      'aria-haspopup': 'menu',
      'aria-expanded': o.overflowOpen ? 'true' : 'false',
      'aria-label': labels.moreCommands,
      title: labels.moreCommands,
      disabled: o.hydrated ? null : true,
    },
    overflowMenu: { id: menuId, popover: 'auto', class: 'overflow-panel', role: 'menu', 'aria-label': labels.overflowMenu, 'data-ribbon-menu': '' },
    overflowEntries: o.overflow.map((entry, i) => ({
      key: `${i}`,
      label: entry.label,
      icon: entry.icon,
      bag: { type: 'button', class: 'overflow-entry', role: 'menuitem', tabindex: -1, 'data-ribbon-overflow-entry': i },
    })),
  };
}

// ---------------------------------------------------------------------------
// Group: a toolbar of items; collapsed by the reflow into a popup behind a trigger.

export interface RibbonGroupInputs {
  groupId?: string;
  label?: string;
  icon?: string;
  /** The dialog launcher's label; no launcher when empty. */
  dialogLauncher?: string;
  /** Higher collapses later (without a tab `reduceOrder`). */
  priority?: number;
  /** False keeps the group at its size whatever the width. */
  autoScale?: boolean;
  keyTip?: string | null;
}

export interface RibbonGroupView {
  readonly parts: RibbonParts;
  readonly root: RibbonBag;
  readonly body: RibbonBag;
  readonly label: string;
  readonly launcher: RibbonBag | null;
  readonly trigger: RibbonBag;
  readonly icon: string;
}

export interface ConnectRibbonGroupOptions {
  readonly id: string;
  readonly inputs: Readonly<RibbonGroupInputs>;
  readonly context: RibbonContext;
  readonly open: boolean;
  readonly hydrated: boolean;
}

export function connectRibbonGroup(o: ConnectRibbonGroupOptions): RibbonGroupView {
  const { inputs } = o;
  const groupId = inputs.groupId ?? '';
  const label = inputs.label ?? '';
  const bodyId = `${o.id}-body`;
  const ideal = o.context.idealSizes?.[groupId];
  return {
    parts: RIBBON_PARTS,
    root: {
      class: 'ribbon-group-host',
      'data-ribbon-group': groupId,
      'data-ideal-size': ideal && ideal !== 'large' ? ideal : null,
      'data-priority': inputs.priority ?? 0,
      'data-auto-scale': inputs.autoScale === false ? 'false' : null,
      'data-key-tip': inputs.keyTip ?? null,
      'data-label': label,
    },
    body: { id: bodyId, class: 'ribbon-group', role: 'toolbar', 'aria-label': label || null, 'data-ribbon-toolbar': '', 'data-ribbon-group-body': '' },
    label,
    launcher: inputs.dialogLauncher
      ? {
          type: 'button',
          class: 'ribbon-dialog-launcher',
          title: inputs.dialogLauncher,
          'aria-label': inputs.dialogLauncher,
          'data-ribbon-launcher': '',
          disabled: o.hydrated ? null : true,
        }
      : null,
    trigger: {
      type: 'button',
      class: 'ribbon-popup-trigger',
      popovertarget: bodyId,
      'aria-haspopup': 'true',
      'aria-expanded': o.open ? 'true' : 'false',
      'aria-label': label || null,
      title: label || null,
      'data-ribbon-popup-trigger': '',
      disabled: o.hydrated ? null : true,
    },
    icon: inputs.icon ?? '',
  };
}

// ---------------------------------------------------------------------------
// Quick access toolbar.

export interface RibbonQuickAccessToolbarInputs {
  touchMode?: RibbonTouchMode;
}

export function connectQuickAccessToolbar(o: { touchMode: RibbonTouchMode; label: string | null; labels: RibbonLabels }): RibbonBag {
  return {
    class: 'qat',
    role: 'toolbar',
    'aria-label': o.label || o.labels.quickAccessToolbar,
    'data-touch-mode': o.touchMode,
    'data-ribbon-toolbar': '',
  };
}

// ---------------------------------------------------------------------------
// Items.

export interface RibbonItemView {
  readonly parts: RibbonParts;
  readonly root: RibbonBag;
  /** The `<label>` around a checkbox or colour input (an empty bag for the other kinds). */
  readonly wrap: RibbonBag;
  readonly control: RibbonBag;
  readonly label: string;
  readonly icon: string;
  /** A checkbox's live `checked` property. */
  readonly checked: boolean;
  /** A colour input's live `value` property. */
  readonly value: string;
}

export interface ConnectRibbonItemOptions {
  readonly kind: string;
  readonly inputs: Readonly<RibbonItemInputs>;
  readonly hydrated: boolean;
}

export function ribbonItemSize(size: unknown): RibbonItemSize {
  return size === 'large' || size === 'small' ? size : 'medium';
}

/** The item root every kind shares: what the KeyTips, the overflow menu and the size rules read. */
export function ribbonItemRoot(o: ConnectRibbonItemOptions, extra: RibbonBag = {}): RibbonBag {
  return {
    class: `ribbon-item ribbon-${o.kind}-host`,
    'data-ribbon-item': o.kind,
    'data-item-id': o.inputs.itemId || null,
    'data-size': ribbonItemSize(o.inputs.size),
    'data-label': o.inputs.label || null,
    'data-icon': o.inputs.icon || null,
    'data-key-tip': o.inputs.keyTip || null,
    'data-disabled': o.inputs.disabled ? '' : null,
    ...extra,
  };
}

const off = (o: ConnectRibbonItemOptions) => (o.inputs.disabled || !o.hydrated ? true : null);

/** A command button's own attributes; `data-ribbon-control` makes it a toolbar stop. */
export function ribbonControl(o: ConnectRibbonItemOptions, extra: RibbonBag = {}): RibbonBag {
  return {
    type: 'button',
    'data-ribbon-control': '',
    title: o.inputs.tooltip || o.inputs.label || null,
    disabled: off(o),
    ...extra,
  };
}

function itemView(o: ConnectRibbonItemOptions, control: RibbonBag, extra: Partial<RibbonItemView> = {}): RibbonItemView {
  return {
    parts: RIBBON_PARTS,
    root: ribbonItemRoot(o),
    wrap: {},
    control,
    checked: false,
    value: '',
    label: o.inputs.label ?? '',
    icon: o.inputs.icon ?? '',
    ...extra,
  };
}

export function connectRibbonButton(o: ConnectRibbonItemOptions): RibbonItemView {
  return itemView(o, ribbonControl(o, { class: 'ribbon-button' }));
}

export function connectRibbonToggleButton(o: ConnectRibbonItemOptions & { pressed: boolean }): RibbonItemView {
  return itemView(o, ribbonControl(o, { class: `ribbon-button ribbon-toggle-button${o.pressed ? ' pressed' : ''}`, 'aria-pressed': o.pressed ? 'true' : 'false' }), {
    root: ribbonItemRoot(o, { 'data-pressed': o.pressed ? '' : null }),
  });
}

/** A checkbox or colour input: a native input in a `<label>` that names it. */
function fieldWrap(o: ConnectRibbonItemOptions, cls: string): RibbonBag {
  return { class: `${cls}${o.inputs.disabled ? ' disabled' : ''}`, title: o.inputs.tooltip || o.inputs.label || null };
}

export function connectRibbonCheckBox(o: ConnectRibbonItemOptions & { checked: boolean }): RibbonItemView {
  return itemView(o, { type: 'checkbox', class: 'ribbon-checkbox-input', 'data-ribbon-control': '', disabled: off(o) }, {
    checked: o.checked,
    wrap: fieldWrap(o, 'ribbon-checkbox'),
    icon: '',
  });
}

export function connectRibbonColorPicker(o: ConnectRibbonItemOptions & { color: string }): RibbonItemView {
  return itemView(o, { type: 'color', class: 'ribbon-color-picker-input', 'data-ribbon-control': '', 'aria-label': o.inputs.label || null, disabled: off(o) }, {
    value: o.color,
    wrap: fieldWrap(o, 'ribbon-color-picker'),
    icon: '',
  });
}

export interface RibbonOptionView {
  readonly key: string;
  readonly label: string;
  readonly bag: RibbonBag;
}

export interface RibbonComboBoxOption {
  readonly label: string;
  readonly value: string;
}

export function connectRibbonComboBox(
  o: ConnectRibbonItemOptions & { value: string; options: readonly RibbonComboBoxOption[] },
): RibbonItemView & { options: readonly RibbonOptionView[] } {
  return {
    ...itemView(
      o,
      {
        class: 'ribbon-combobox-select',
        'data-ribbon-control': '',
        'aria-label': o.inputs.label || null,
        title: o.inputs.tooltip || o.inputs.label || null,
        disabled: off(o),
      },
      { icon: '' },
    ),
    options: o.options.map((option) => ({
      key: option.value,
      label: option.label,
      bag: { value: option.value, selected: option.value === o.value },
    })),
  };
}

export interface RibbonGroupButtonOption {
  readonly label: string;
  readonly value: string;
  readonly icon?: string;
}

export interface RibbonRadioView {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly bag: RibbonBag;
}

export function connectRibbonGroupButton(
  o: ConnectRibbonItemOptions & { selectedValue: string; buttons: readonly RibbonGroupButtonOption[] },
): RibbonItemView & { radios: readonly RibbonRadioView[] } {
  return {
    ...itemView(o, { class: 'ribbon-group-button', role: 'radiogroup', 'aria-label': o.inputs.label || null }, { icon: '' }),
    radios: o.buttons.map((button) => {
      const checked = button.value === o.selectedValue;
      return {
        key: button.value,
        label: button.label,
        icon: button.icon ?? '',
        bag: {
          type: 'button',
          role: 'radio',
          class: `ribbon-group-button-item${checked ? ' selected' : ''}`,
          'aria-checked': checked ? 'true' : 'false',
          title: button.label,
          'data-ribbon-control': '',
          'data-value': button.value,
          disabled: off(o),
        },
      };
    }),
  };
}

export interface RibbonMenuButtonView extends RibbonItemView {
  readonly menu: RibbonBag;
}

/** The popup menu of a dropdown or split button: a native popover, opened by `popovertarget`. */
function itemMenu(id: string, label: string): RibbonBag {
  return { id: `${id}-menu`, popover: 'auto', class: 'menu-panel', role: 'menu', 'aria-label': label || null, 'data-ribbon-menu': '' };
}

export function connectRibbonDropdownButton(o: ConnectRibbonItemOptions & { id: string; open: boolean }): RibbonMenuButtonView {
  return {
    ...itemView(
      o,
      ribbonControl(o, {
        class: 'ribbon-button ribbon-dropdown-button',
        popovertarget: `${o.id}-menu`,
        'aria-haspopup': 'menu',
        'aria-expanded': o.open ? 'true' : 'false',
        'data-ribbon-menu-trigger': '',
      }),
    ),
    menu: itemMenu(o.id, o.inputs.label ?? ''),
  };
}

export interface RibbonSplitButtonView extends RibbonMenuButtonView {
  readonly group: RibbonBag;
  readonly toggle: RibbonBag;
}

export function connectRibbonSplitButton(o: ConnectRibbonItemOptions & { id: string; open: boolean; labels: RibbonLabels }): RibbonSplitButtonView {
  const label = o.inputs.label ?? '';
  return {
    ...itemView(o, ribbonControl(o, { class: 'ribbon-button ribbon-split-button-main', 'data-ribbon-main': '' })),
    group: { class: 'ribbon-split-button', role: 'group', 'aria-label': label || null },
    toggle: ribbonControl(o, {
      class: 'ribbon-split-button-dropdown',
      title: null,
      popovertarget: `${o.id}-menu`,
      'aria-label': ribbonLabel(o.labels.itemOptions, { label }),
      'aria-haspopup': 'menu',
      'aria-expanded': o.open ? 'true' : 'false',
      'data-ribbon-menu-trigger': '',
    }),
    menu: itemMenu(o.id, label),
  };
}

export interface RibbonMenuItemInputs {
  itemId?: string;
  label?: string;
  icon?: string;
  kind?: RibbonMenuItemKind;
  checked?: boolean;
  disabled?: boolean;
}

export interface RibbonMenuItemView {
  readonly parts: RibbonParts;
  readonly root: RibbonBag;
  readonly button: RibbonBag;
  readonly checkable: boolean;
  readonly check: string;
  readonly label: string;
  readonly icon: string;
}

export function connectRibbonMenuItem(o: { inputs: Readonly<RibbonMenuItemInputs>; checked: boolean; hydrated: boolean }): RibbonMenuItemView {
  const kind = o.inputs.kind ?? 'action';
  const checkable = kind === 'checkbox' || kind === 'radio';
  return {
    parts: RIBBON_PARTS,
    // A div, not an li: the implicit listitem role would override `none`.
    root: { class: 'ribbon-menu-item', role: 'none', 'data-item-id': o.inputs.itemId || null },
    button: {
      type: 'button',
      class: 'menu-item',
      role: kind === 'checkbox' ? 'menuitemcheckbox' : kind === 'radio' ? 'menuitemradio' : 'menuitem',
      'aria-checked': checkable ? (o.checked ? 'true' : 'false') : null,
      tabindex: -1,
      'data-ribbon-menu-item': '',
      disabled: o.inputs.disabled || !o.hydrated ? true : null,
    },
    checkable,
    check: o.checked ? '✓' : '',
    label: o.inputs.label ?? '',
    icon: o.inputs.icon ?? '',
  };
}

export function connectRibbonMenuSeparator(): RibbonBag {
  return { class: 'ribbon-menu-separator', role: 'separator' };
}

export interface RibbonGalleryInputs extends RibbonItemInputs {
  columns?: number;
}

export function connectRibbonGallery(o: ConnectRibbonItemOptions & { columns: number }): RibbonItemView & { columns: RibbonStyle } {
  return {
    ...itemView(o, { class: 'ribbon-gallery', role: 'listbox', 'aria-label': o.inputs.label || null }, { icon: '' }),
    columns: { '--ribbon-gallery-columns': String(Math.max(1, Math.floor(o.columns) || 1)) },
  };
}

export interface RibbonGalleryItemInputs {
  itemId?: string;
  label?: string;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
}

export function connectRibbonGalleryItem(o: { inputs: Readonly<RibbonGalleryItemInputs>; hydrated: boolean }): RibbonItemView {
  const selected = !!o.inputs.selected;
  return {
    parts: RIBBON_PARTS,
    root: { class: 'ribbon-gallery-item', role: 'none', 'data-item-id': o.inputs.itemId || null },
    wrap: {},
    checked: false,
    value: '',
    control: {
      type: 'button',
      class: `gallery-item${selected ? ' selected' : ''}`,
      role: 'option',
      'aria-selected': selected ? 'true' : 'false',
      'aria-label': o.inputs.label || null,
      title: o.inputs.label || null,
      'data-ribbon-control': '',
      disabled: o.inputs.disabled || !o.hydrated ? true : null,
    },
    label: o.inputs.label ?? '',
    icon: o.inputs.icon ?? '',
  };
}

export function connectRibbonTemplateItem(o: { size: unknown }): RibbonBag {
  return { class: 'ribbon-item ribbon-template-item', 'data-ribbon-item': 'template', 'data-size': ribbonItemSize(o.size) };
}

/** The Lit/test-friendly re-export of the boolean reading a content query needs. */
export { contentFlag };
