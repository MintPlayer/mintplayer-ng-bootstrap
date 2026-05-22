#!/usr/bin/env node
/**
 * One-off bootstrap script — emits one `.vue` SFC adapter per WC class
 * in libs/mintplayer-vue-bootstrap/<entry>/src/. Run once to scaffold;
 * the committed output is the source of truth.
 *
 * Default shape (display-only WCs): a thin <script setup> that
 * side-effect-imports the WC + forwards `<slot />` into the underlying
 * element. Input WCs (date pickers, OTP, multi-range, query-builder)
 * additionally use `defineModel()` for native `v-model` support; the
 * inventory below tags which entries get the v-model variant.
 *
 * Hand-edit any wrapper to refine prop types, add typed event emits, or
 * customise the template (e.g. for nested slots).
 *
 * Usage: node tools/scripts/bootstrap-vue-wrappers.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const vueLibRoot = join(repoRoot, 'libs', 'mintplayer-vue-bootstrap');

/** Same inventory as the React bootstrap, plus a per-wrapper `vModel` flag. */
const inventory = [
  { entry: 'calendar',        wrappers: [{ tagName: 'mp-calendar',          vueName: 'BsCalendar',          vModel: true }]},
  { entry: 'card',            wrappers: [
    { tagName: 'mp-card',          vueName: 'BsCard' },
    { tagName: 'mp-card-body',     vueName: 'BsCardBody' },
    { tagName: 'mp-card-footer',   vueName: 'BsCardFooter' },
    { tagName: 'mp-card-group',    vueName: 'BsCardGroup' },
    { tagName: 'mp-card-header',   vueName: 'BsCardHeader' },
    { tagName: 'mp-card-img',      vueName: 'BsCardImg' },
    { tagName: 'mp-card-link',     vueName: 'BsCardLink' },
    { tagName: 'mp-card-subtitle', vueName: 'BsCardSubtitle' },
    { tagName: 'mp-card-text',     vueName: 'BsCardText' },
    { tagName: 'mp-card-title',    vueName: 'BsCardTitle' },
  ]},
  { entry: 'checkbox',        wrappers: [{ tagName: 'mp-checkbox',          vueName: 'BsCheckbox',          vModel: true }]},
  { entry: 'code-snippet',    wrappers: [{ tagName: 'mp-code-snippet',      vueName: 'BsCodeSnippet' }]},
  { entry: 'datatable',       wrappers: [{ tagName: 'mp-datatable',         vueName: 'BsDatatable' }]},
  { entry: 'datepicker',      wrappers: [{ tagName: 'mp-datepicker',        vueName: 'BsDatepicker',        vModel: true }]},
  { entry: 'datetime-picker', wrappers: [{ tagName: 'mp-datetime-picker',   vueName: 'BsDatetimePicker',    vModel: true }]},
  { entry: 'dock',            wrappers: [{ tagName: 'mint-dock-manager',    vueName: 'BsDockManager' }]},
  { entry: 'file-manager',    wrappers: [{ tagName: 'mp-file-manager',      vueName: 'BsFileManager' }]},
  { entry: 'multi-range',     wrappers: [{ tagName: 'mp-multi-range',       vueName: 'BsMultiRange',        vModel: true }]},
  { entry: 'otp-input',       wrappers: [{ tagName: 'mp-otp-input',         vueName: 'BsOtpInput',          vModel: true }]},
  { entry: 'pagination',      wrappers: [{ tagName: 'mp-pagination',        vueName: 'BsPagination',        vModel: true }]},
  { entry: 'query-builder',   wrappers: [
    { tagName: 'mp-query-builder',   vueName: 'BsQueryBuilder', vModel: true },
    { tagName: 'mp-query-condition', vueName: 'BsQueryCondition' },
    { tagName: 'mp-query-group',     vueName: 'BsQueryGroup' },
    { tagName: 'mp-query-subquery',  vueName: 'BsQuerySubquery' },
  ]},
  { entry: 'radio',           wrappers: [{ tagName: 'mp-radio',             vueName: 'BsRadio',             vModel: true }]},
  { entry: 'ribbon',          wrappers: [
    { tagName: 'mp-ribbon',                   vueName: 'BsRibbon' },
    { tagName: 'mp-ribbon-tab',               vueName: 'BsRibbonTab' },
    { tagName: 'mp-ribbon-group',             vueName: 'BsRibbonGroup' },
    { tagName: 'mp-ribbon-contextual-tab-set',vueName: 'BsRibbonContextualTabSet' },
    { tagName: 'mp-quick-access-toolbar',     vueName: 'BsQuickAccessToolbar' },
    { tagName: 'mp-ribbon-button',            vueName: 'BsRibbonButton' },
    { tagName: 'mp-ribbon-checkbox',          vueName: 'BsRibbonCheckBox' },
    { tagName: 'mp-ribbon-color-picker',      vueName: 'BsRibbonColorPicker' },
    { tagName: 'mp-ribbon-combobox',          vueName: 'BsRibbonComboBox' },
    { tagName: 'mp-ribbon-dropdown-button',   vueName: 'BsRibbonDropdownButton' },
    { tagName: 'mp-ribbon-gallery',           vueName: 'BsRibbonGallery' },
    { tagName: 'mp-ribbon-gallery-item',      vueName: 'BsRibbonGalleryItem' },
    { tagName: 'mp-ribbon-group-button',      vueName: 'BsRibbonGroupButton' },
    { tagName: 'mp-ribbon-menu-item',         vueName: 'BsRibbonMenuItem' },
    { tagName: 'mp-ribbon-menu-separator',    vueName: 'BsRibbonMenuSeparator' },
    { tagName: 'mp-ribbon-split-button',      vueName: 'BsRibbonSplitButton' },
    { tagName: 'mp-ribbon-template-item',     vueName: 'BsRibbonTemplateItem' },
    { tagName: 'mp-ribbon-toggle-button',     vueName: 'BsRibbonToggleButton' },
  ]},
  { entry: 'scheduler',       wrappers: [{ tagName: 'mp-scheduler',         vueName: 'BsScheduler' }]},
  { entry: 'splitter',        wrappers: [{ tagName: 'mp-splitter',          vueName: 'BsSplitter' }]},
  { entry: 'tab-control',     wrappers: [
    { tagName: 'mp-tab-control', vueName: 'BsTabControl', vModel: true },
    { tagName: 'mp-tab-page',    vueName: 'BsTabPage' },
  ]},
  { entry: 'tile-manager',    wrappers: [{ tagName: 'mp-tile-manager',      vueName: 'BsTileManager' }]},
  { entry: 'timepicker',      wrappers: [
    { tagName: 'mp-timepicker', vueName: 'BsTimepicker', vModel: true },
    { tagName: 'mp-time-list',  vueName: 'BsTimeList' },
  ]},
  { entry: 'toggle-button',   wrappers: [{ tagName: 'mp-toggle-button',     vueName: 'BsToggleButton',      vModel: true }]},
  { entry: 'treeview',        wrappers: [{ tagName: 'mp-treeview',          vueName: 'BsTreeview' }]},
];

function displayWrapper(tagName, entry) {
  return `<script setup lang="ts">
// Side-effect-registers <${tagName}> via the upstream WC entry.
import '@mintplayer/web-components/${entry}';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <${tagName} v-bind="$attrs">
    <slot />
  </${tagName}>
</template>
`;
}

function vModelWrapper(tagName, entry) {
  return `<script setup lang="ts">
// Side-effect-registers <${tagName}> via the upstream WC entry.
import '@mintplayer/web-components/${entry}';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// Default v-model is the WC's \`value\` property + \`change\` event.
// Hand-edit this file if the WC uses different names (e.g. \`selection\`
// + \`select\` for multi-select WCs).
const modelValue = defineModel<unknown>();
const el = ref<HTMLElement | null>(null);

const syncToEl = (v: unknown) => {
  if (el.value) (el.value as unknown as { value: unknown }).value = v;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onChange(e: Event) {
  modelValue.value = (e.target as unknown as { value: unknown }).value;
}
</script>

<template>
  <${tagName}
    ref="el"
    v-bind="$attrs"
    @change="onChange"
  >
    <slot />
  </${tagName}>
</template>
`;
}

function entryIndexFile(wrappers) {
  return wrappers.map((w) => `export { default as ${w.vueName} } from './${w.vueName}.vue';`).join('\n') + '\n';
}

let createdFiles = 0;
let createdEntries = 0;
for (const { entry, wrappers } of inventory) {
  const srcDir = join(vueLibRoot, entry, 'src');
  mkdirSync(srcDir, { recursive: true });

  // Root index.ts (re-export from src)
  const rootIndex = join(vueLibRoot, entry, 'index.ts');
  if (!existsSync(rootIndex)) {
    writeFileSync(rootIndex, `export * from './src';\n`);
  }

  // src/index.ts (barrel of all wrappers in this entry)
  const srcIndex = join(srcDir, 'index.ts');
  writeFileSync(srcIndex, entryIndexFile(wrappers));

  // Per-wrapper .vue files
  for (const w of wrappers) {
    const wrapperPath = join(srcDir, `${w.vueName}.vue`);
    const content = w.vModel ? vModelWrapper(w.tagName, entry) : displayWrapper(w.tagName, entry);
    writeFileSync(wrapperPath, content);
    createdFiles++;
  }
  createdEntries++;
}

console.log(`Bootstrap complete: ${createdFiles} Vue wrappers across ${createdEntries} entries.`);
