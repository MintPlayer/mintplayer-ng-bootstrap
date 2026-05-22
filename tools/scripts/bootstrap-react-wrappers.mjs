#!/usr/bin/env node
/**
 * One-off bootstrap script — emits one `.tsx` React wrapper per WC class
 * in libs/mintplayer-react-bootstrap/<entry>/src/. Run once to scaffold
 * the wrappers; the committed output is the source of truth (hand-edit
 * any specific wrapper freely).
 *
 * Mapping convention:
 * - Class `Mp<Name>Element` or `Mp<Name>` (or `Mint<Name>Element`) →
 *   tag `mp-<kebab>` (or `mint-<kebab>` for the dock) →
 *   React component `Bs<Name>` (drop the leading Mp/Mint).
 *
 * Each wrapper is a 5-line createComponent call. No events map yet —
 * consumers needing typed events should hand-edit the specific wrapper
 * to add an `events: { onXxx: 'xxx' as EventName<CustomEvent<...>> }`
 * block.
 *
 * Usage: node tools/scripts/bootstrap-react-wrappers.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const reactLibRoot = join(repoRoot, 'libs', 'mintplayer-react-bootstrap');

/**
 * Inventory of WCs to wrap, grouped by sub-entry.
 * Each entry has:
 * - `entry`: the sub-entry name (matches both WC lib and React lib paths)
 * - `wrappers`: list of { className, tagName, reactName, optionsDirImport }
 *
 * `optionsDirImport` is the WC sub-entry path (defaults to the entry).
 */
const inventory = [
  { entry: 'calendar', wrappers: [
    { className: 'MpCalendarElement', tagName: 'mp-calendar', reactName: 'BsCalendar' },
  ]},
  { entry: 'card', wrappers: [
    { className: 'MpCardElement',         tagName: 'mp-card',          reactName: 'BsCard' },
    { className: 'MpCardBodyElement',     tagName: 'mp-card-body',     reactName: 'BsCardBody' },
    { className: 'MpCardFooterElement',   tagName: 'mp-card-footer',   reactName: 'BsCardFooter' },
    { className: 'MpCardGroupElement',    tagName: 'mp-card-group',    reactName: 'BsCardGroup' },
    { className: 'MpCardHeaderElement',   tagName: 'mp-card-header',   reactName: 'BsCardHeader' },
    { className: 'MpCardImgElement',      tagName: 'mp-card-img',      reactName: 'BsCardImg' },
    { className: 'MpCardLinkElement',     tagName: 'mp-card-link',     reactName: 'BsCardLink' },
    { className: 'MpCardSubtitleElement', tagName: 'mp-card-subtitle', reactName: 'BsCardSubtitle' },
    { className: 'MpCardTextElement',     tagName: 'mp-card-text',     reactName: 'BsCardText' },
    { className: 'MpCardTitleElement',    tagName: 'mp-card-title',    reactName: 'BsCardTitle' },
  ]},
  { entry: 'checkbox', wrappers: [
    { className: 'MpCheckbox', tagName: 'mp-checkbox', reactName: 'BsCheckbox' },
  ]},
  { entry: 'code-snippet', wrappers: [
    { className: 'MpCodeSnippet', tagName: 'mp-code-snippet', reactName: 'BsCodeSnippet' },
  ]},
  { entry: 'datatable', wrappers: [
    { className: 'MpDatatable', tagName: 'mp-datatable', reactName: 'BsDatatable' },
  ]},
  { entry: 'datepicker', wrappers: [
    { className: 'MpDatepickerElement', tagName: 'mp-datepicker', reactName: 'BsDatepicker' },
  ]},
  { entry: 'datetime-picker', wrappers: [
    { className: 'MpDatetimePickerElement', tagName: 'mp-datetime-picker', reactName: 'BsDatetimePicker' },
  ]},
  { entry: 'dock', wrappers: [
    { className: 'MintDockManagerElement', tagName: 'mint-dock-manager', reactName: 'BsDockManager' },
  ]},
  { entry: 'file-manager', wrappers: [
    { className: 'MpFileManager', tagName: 'mp-file-manager', reactName: 'BsFileManager' },
  ]},
  { entry: 'multi-range', wrappers: [
    { className: 'MintMultiRangeElement', tagName: 'mp-multi-range', reactName: 'BsMultiRange' },
  ]},
  { entry: 'otp-input', wrappers: [
    { className: 'MintOtpInputElement', tagName: 'mp-otp-input', reactName: 'BsOtpInput' },
  ]},
  { entry: 'pagination', wrappers: [
    { className: 'MpPagination', tagName: 'mp-pagination', reactName: 'BsPagination' },
  ]},
  { entry: 'query-builder', wrappers: [
    { className: 'MpQueryBuilderElement',   tagName: 'mp-query-builder',   reactName: 'BsQueryBuilder' },
    { className: 'MpQueryConditionElement', tagName: 'mp-query-condition', reactName: 'BsQueryCondition' },
    { className: 'MpQueryGroupElement',     tagName: 'mp-query-group',     reactName: 'BsQueryGroup' },
    { className: 'MpQuerySubqueryElement',  tagName: 'mp-query-subquery',  reactName: 'BsQuerySubquery' },
  ]},
  { entry: 'radio', wrappers: [
    { className: 'MpRadio', tagName: 'mp-radio', reactName: 'BsRadio' },
  ]},
  { entry: 'ribbon', wrappers: [
    { className: 'MpRibbon',                tagName: 'mp-ribbon',                   reactName: 'BsRibbon' },
    { className: 'MpRibbonTab',             tagName: 'mp-ribbon-tab',               reactName: 'BsRibbonTab' },
    { className: 'MpRibbonGroup',           tagName: 'mp-ribbon-group',             reactName: 'BsRibbonGroup' },
    { className: 'MpRibbonContextualTabSet',tagName: 'mp-ribbon-contextual-tab-set',reactName: 'BsRibbonContextualTabSet' },
    { className: 'MpQuickAccessToolbar',    tagName: 'mp-quick-access-toolbar',     reactName: 'BsQuickAccessToolbar' },
    { className: 'MpRibbonButton',          tagName: 'mp-ribbon-button',            reactName: 'BsRibbonButton' },
    { className: 'MpRibbonCheckBox',        tagName: 'mp-ribbon-checkbox',          reactName: 'BsRibbonCheckBox' },
    { className: 'MpRibbonColorPicker',     tagName: 'mp-ribbon-color-picker',      reactName: 'BsRibbonColorPicker' },
    { className: 'MpRibbonComboBox',        tagName: 'mp-ribbon-combobox',          reactName: 'BsRibbonComboBox' },
    { className: 'MpRibbonDropdownButton',  tagName: 'mp-ribbon-dropdown-button',   reactName: 'BsRibbonDropdownButton' },
    { className: 'MpRibbonGallery',         tagName: 'mp-ribbon-gallery',           reactName: 'BsRibbonGallery' },
    { className: 'MpRibbonGalleryItem',     tagName: 'mp-ribbon-gallery-item',      reactName: 'BsRibbonGalleryItem' },
    { className: 'MpRibbonGroupButton',     tagName: 'mp-ribbon-group-button',      reactName: 'BsRibbonGroupButton' },
    { className: 'MpRibbonMenuItem',        tagName: 'mp-ribbon-menu-item',         reactName: 'BsRibbonMenuItem' },
    { className: 'MpRibbonMenuSeparator',   tagName: 'mp-ribbon-menu-separator',    reactName: 'BsRibbonMenuSeparator' },
    { className: 'MpRibbonSplitButton',     tagName: 'mp-ribbon-split-button',      reactName: 'BsRibbonSplitButton' },
    { className: 'MpRibbonTemplateItem',    tagName: 'mp-ribbon-template-item',     reactName: 'BsRibbonTemplateItem' },
    { className: 'MpRibbonToggleButton',    tagName: 'mp-ribbon-toggle-button',     reactName: 'BsRibbonToggleButton' },
  ]},
  { entry: 'scheduler', wrappers: [
    { className: 'MpScheduler', tagName: 'mp-scheduler', reactName: 'BsScheduler' },
  ]},
  { entry: 'splitter', wrappers: [
    { className: 'MpSplitter', tagName: 'mp-splitter', reactName: 'BsSplitter' },
  ]},
  { entry: 'tab-control', wrappers: [
    { className: 'MpTabControl', tagName: 'mp-tab-control', reactName: 'BsTabControl' },
    { className: 'MpTabPage',    tagName: 'mp-tab-page',    reactName: 'BsTabPage' },
  ]},
  { entry: 'tile-manager', wrappers: [
    { className: 'MintTileManagerElement', tagName: 'mp-tile-manager', reactName: 'BsTileManager' },
  ]},
  { entry: 'timepicker', wrappers: [
    { className: 'MpTimepickerElement', tagName: 'mp-timepicker', reactName: 'BsTimepicker' },
    { className: 'MpTimeListElement',   tagName: 'mp-time-list',  reactName: 'BsTimeList' },
  ]},
  { entry: 'toggle-button', wrappers: [
    { className: 'MpToggleButton', tagName: 'mp-toggle-button', reactName: 'BsToggleButton' },
  ]},
  { entry: 'treeview', wrappers: [
    { className: 'MpTreeview', tagName: 'mp-treeview', reactName: 'BsTreeview' },
  ]},
];

function wrapperFile(w, entry) {
  return `import * as React from 'react';
import { createComponent } from '@lit/react';
import { ${w.className} } from '@mintplayer/web-components/${entry}';

/**
 * React wrapper for \`<${w.tagName}>\`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off ${w.className};
 * hand-edit this file to add an \`events: { onXxx: 'xxx' as EventName<...> }\`
 * block if you need typed event listeners.
 */
export const ${w.reactName} = createComponent({
  react: React,
  tagName: '${w.tagName}',
  elementClass: ${w.className},
});
`;
}

function entryIndexFile(wrappers) {
  return wrappers.map((w) => `export { ${w.reactName} } from './${w.reactName}';`).join('\n') + '\n';
}

function rootEntryIndex() {
  return `export * from './src';\n`;
}

let createdFiles = 0;
let createdEntries = 0;
for (const { entry, wrappers } of inventory) {
  const srcDir = join(reactLibRoot, entry, 'src');
  mkdirSync(srcDir, { recursive: true });

  // Root index.ts (re-export from src)
  const rootIndex = join(reactLibRoot, entry, 'index.ts');
  if (!existsSync(rootIndex)) {
    writeFileSync(rootIndex, rootEntryIndex());
  }

  // src/index.ts (barrel of all wrappers in this entry)
  const srcIndex = join(srcDir, 'index.ts');
  writeFileSync(srcIndex, entryIndexFile(wrappers));

  // Per-wrapper .tsx files
  for (const w of wrappers) {
    const wrapperPath = join(srcDir, `${w.reactName}.tsx`);
    writeFileSync(wrapperPath, wrapperFile(w, entry));
    createdFiles++;
  }
  createdEntries++;
}

console.log(`Bootstrap complete: ${createdFiles} wrappers across ${createdEntries} entries.`);
