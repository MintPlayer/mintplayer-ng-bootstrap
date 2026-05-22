#!/usr/bin/env node
/**
 * One-off bootstrap script — emits demo pages for the remaining WC-backed
 * routes (everything from the WC inventory that wasn't covered by the
 * initial 6 pages per framework in phases 6 + 7).
 *
 * For each entry: writes the React .tsx page and the Vue .vue view with
 * a minimal but valid demo + code snippet. Each page is hand-editable
 * source; the script just avoids ~32 separate Write calls.
 *
 * Route registration is NOT emitted here — that requires editing the
 * app.tsx / router/index.ts files in place (done separately).
 *
 * Usage: node tools/scripts/bootstrap-demo-pages.mjs
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const reactPagesDir = join(repoRoot, 'apps', 'react-bootstrap-demo', 'src', 'app', 'pages');
const vueViewsDir = join(repoRoot, 'apps', 'vue-bootstrap-demo', 'src', 'views');

/**
 * Inventory of WC-backed routes that still need demo pages.
 * `body` is the React demo block (JSX); `vueBody` is the Vue equivalent
 * (template snippet). The source-snippet is generated from the same body.
 */
const pages = [
  // Basic
  { entry: 'calendar', label: 'Calendar', section: 'Basic', path: '/calendar',
    react: { components: ['BsCalendar'], body: '<BsCalendar />', source: `<BsCalendar />` },
    vue: { components: ['BsCalendar'], body: '<BsCalendar />', source: `<BsCalendar />` },
  },
  { entry: 'datetime-picker', label: 'Datetime picker', section: 'Basic', path: '/datetime-picker',
    react: { components: ['BsDatetimePicker'], body: '<BsDatetimePicker />', source: `<BsDatetimePicker />` },
    vue: { components: ['BsDatetimePicker'], body: '<BsDatetimePicker />', source: `<BsDatetimePicker />` },
  },
  { entry: 'timepicker', label: 'Timepicker', section: 'Basic', path: '/timepicker',
    react: { components: ['BsTimepicker'], body: '<BsTimepicker />', source: `<BsTimepicker />` },
    vue: { components: ['BsTimepicker'], body: '<BsTimepicker />', source: `<BsTimepicker />` },
  },
  { entry: 'checkbox', label: 'Checkbox', section: 'Basic', path: '/checkbox',
    react: { components: ['BsCheckbox'], body: '<BsCheckbox />', source: `<BsCheckbox />` },
    vue: { components: ['BsCheckbox'], body: '<BsCheckbox />', source: `<BsCheckbox />` },
  },
  { entry: 'radio', label: 'Radio', section: 'Basic', path: '/radio',
    react: { components: ['BsRadio'], body: '<BsRadio />', source: `<BsRadio />` },
    vue: { components: ['BsRadio'], body: '<BsRadio />', source: `<BsRadio />` },
  },
  { entry: 'toggle-button', label: 'Toggle button', section: 'Basic', path: '/toggle-button',
    react: { components: ['BsToggleButton'], body: '<BsToggleButton>Toggle me</BsToggleButton>', source: `<BsToggleButton>Toggle me</BsToggleButton>` },
    vue: { components: ['BsToggleButton'], body: '<BsToggleButton>Toggle me</BsToggleButton>', source: `<BsToggleButton>Toggle me</BsToggleButton>` },
  },
  { entry: 'pagination', label: 'Pagination', section: 'Basic', path: '/pagination',
    react: { components: ['BsPagination'], body: '<BsPagination />', source: `<BsPagination />` },
    vue: { components: ['BsPagination'], body: '<BsPagination />', source: `<BsPagination />` },
  },
  { entry: 'treeview', label: 'Treeview', section: 'Basic', path: '/treeview',
    react: { components: ['BsTreeview'], body: '<BsTreeview />', source: `<BsTreeview />`, note: 'Set the `nodes` property on a ref for sample data.' },
    vue: { components: ['BsTreeview'], body: '<BsTreeview />', source: `<BsTreeview />`, note: 'Bind `:nodes.prop` for sample data.' },
  },
  { entry: 'tab-control', label: 'Tab control', section: 'Basic', path: '/tab-control',
    react: { components: ['BsTabControl', 'BsTabPage'],
      body: `<BsTabControl style={{ minHeight: '200px' }}>
          <BsTabPage>
            <span slot="header">Tab 1</span>
            <p>Content of tab 1.</p>
          </BsTabPage>
          <BsTabPage>
            <span slot="header">Tab 2</span>
            <p>Content of tab 2.</p>
          </BsTabPage>
        </BsTabControl>`,
      source: `<BsTabControl>
  <BsTabPage>
    <span slot="header">Tab 1</span>
    <p>Content of tab 1.</p>
  </BsTabPage>
  <BsTabPage>
    <span slot="header">Tab 2</span>
    <p>Content of tab 2.</p>
  </BsTabPage>
</BsTabControl>` },
    vue: { components: ['BsTabControl', 'BsTabPage'],
      body: `<BsTabControl style="min-height: 200px">
          <BsTabPage>
            <span slot="header">Tab 1</span>
            <p>Content of tab 1.</p>
          </BsTabPage>
          <BsTabPage>
            <span slot="header">Tab 2</span>
            <p>Content of tab 2.</p>
          </BsTabPage>
        </BsTabControl>`,
      source: `<BsTabControl>
  <BsTabPage>
    <span slot="header">Tab 1</span>
    <p>Content of tab 1.</p>
  </BsTabPage>
  <BsTabPage>
    <span slot="header">Tab 2</span>
    <p>Content of tab 2.</p>
  </BsTabPage>
</BsTabControl>` },
  },

  // Advanced
  { entry: 'splitter', label: 'Splitter', section: 'Advanced', path: '/advanced/splitter',
    react: { components: ['BsSplitter'],
      body: `<div style={{ height: '300px' }}>
          <BsSplitter>
            <div slot="panel-0" style={{ padding: '1rem' }}>Left panel</div>
            <div slot="panel-1" style={{ padding: '1rem' }}>Right panel</div>
          </BsSplitter>
        </div>`,
      source: `<BsSplitter>
  <div slot="panel-0">Left panel</div>
  <div slot="panel-1">Right panel</div>
</BsSplitter>` },
    vue: { components: ['BsSplitter'],
      body: `<div style="height: 300px">
          <BsSplitter>
            <div slot="panel-0" style="padding: 1rem">Left panel</div>
            <div slot="panel-1" style="padding: 1rem">Right panel</div>
          </BsSplitter>
        </div>`,
      source: `<BsSplitter>
  <div slot="panel-0">Left panel</div>
  <div slot="panel-1">Right panel</div>
</BsSplitter>` },
  },
  { entry: 'otp-input', label: 'OTP input', section: 'Advanced', path: '/advanced/otp-input',
    react: { components: ['BsOtpInput'], body: '<BsOtpInput />', source: `<BsOtpInput />` },
    vue: { components: ['BsOtpInput'], body: '<BsOtpInput />', source: `<BsOtpInput />` },
  },
  { entry: 'multi-range', label: 'Multi-range', section: 'Advanced', path: '/advanced/multi-range',
    react: { components: ['BsMultiRange'], body: '<BsMultiRange />', source: `<BsMultiRange />` },
    vue: { components: ['BsMultiRange'], body: '<BsMultiRange />', source: `<BsMultiRange />` },
  },

  // Enterprise
  { entry: 'tile-manager', label: 'Tile manager', section: 'Enterprise', path: '/enterprise/tile-manager',
    react: { components: ['BsTileManager'], body: '<BsTileManager style={{ height: \'400px\' }} />', source: `<BsTileManager style={{ height: '400px' }} />`, note: 'Set the `tiles` property on a ref for sample data.' },
    vue: { components: ['BsTileManager'], body: '<BsTileManager style="height: 400px" />', source: `<BsTileManager style="height: 400px" />`, note: 'Bind `:tiles.prop` for sample data.' },
  },
  { entry: 'query-builder', label: 'Query builder', section: 'Enterprise', path: '/enterprise/query-builder',
    react: { components: ['BsQueryBuilder'], body: '<BsQueryBuilder />', source: `<BsQueryBuilder />`, note: 'Set the `schema` property on a ref to enable field selection.' },
    vue: { components: ['BsQueryBuilder'], body: '<BsQueryBuilder />', source: `<BsQueryBuilder />`, note: 'Bind `:schema.prop` to enable field selection.' },
  },
  { entry: 'datatable', label: 'Datatable', section: 'Enterprise', path: '/enterprise/datatables',
    react: { components: ['BsDatatable'], body: '<BsDatatable />', source: `<BsDatatable />`, note: 'Set `columns` and `rows` properties on a ref.' },
    vue: { components: ['BsDatatable'], body: '<BsDatatable />', source: `<BsDatatable />`, note: 'Bind `:columns.prop` and `:rows.prop`.' },
  },
  { entry: 'file-manager', label: 'File manager', section: 'Enterprise', path: '/enterprise/file-manager',
    react: { components: ['BsFileManager'], body: '<BsFileManager style={{ height: \'400px\' }} />', source: `<BsFileManager style={{ height: '400px' }} />`, note: 'Set the `files` property on a ref.' },
    vue: { components: ['BsFileManager'], body: '<BsFileManager style="height: 400px" />', source: `<BsFileManager style="height: 400px" />`, note: 'Bind `:files.prop`.' },
  },
];

function pascalToFile(name) {
  return name; // keep as-is; React file names use PascalCase + "Page" suffix
}

function reactPageName(entry) {
  // 'tab-control' → 'TabControlPage'
  return entry
    .split('-')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('') + 'Page';
}

function vueViewName(entry) {
  return entry
    .split('-')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('') + 'View';
}

function reactFile(page) {
  const { entry, label, react } = page;
  const imports = react.components.join(', ');
  const note = react.note ? `      <p className="small text-body-secondary mt-2">${react.note}</p>\n` : '';
  return `import { ${imports} } from '@mintplayer/react-bootstrap/${entry}';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = ${JSON.stringify(react.source)};

export function ${reactPageName(entry)}() {
  return (
    <div className="demo-page">
      <h1>${label}</h1>
      <section>
        <h2>Default</h2>
        ${react.body}
${note}      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
`;
}

function vueFile(page) {
  const { entry, label, vue } = page;
  const imports = vue.components.join(', ');
  const note = vue.note ? `        <p class="small text-body-secondary mt-2">${vue.note}</p>\n` : '';
  return `<script setup lang="ts">
import { ${imports} } from '@mintplayer/vue-bootstrap/${entry}';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = ${JSON.stringify(vue.source)};
</script>

<template>
  <div class="demo-page">
    <h1>${label}</h1>
    <section>
      <h2>Default</h2>
      ${vue.body}
${note}    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
`;
}

let count = 0;
for (const page of pages) {
  const reactPath = join(reactPagesDir, `${reactPageName(page.entry)}.tsx`);
  const vuePath = join(vueViewsDir, `${vueViewName(page.entry)}.vue`);
  if (!existsSync(reactPath)) writeFileSync(reactPath, reactFile(page));
  if (!existsSync(vuePath)) writeFileSync(vuePath, vueFile(page));
  count++;
}

// Emit route + sidebar config snippets to stdout for manual paste into
// app.tsx / app router / sidebar config (less error-prone than editing
// those files programmatically across two frameworks).

const reactRoutes = pages.map((p) =>
  `        <Route path="${p.path}" element={<${reactPageName(p.entry)} />} />`,
).join('\n');

const reactImports = pages.map((p) =>
  `import { ${reactPageName(p.entry)} } from './pages/${reactPageName(p.entry)}';`,
).join('\n');

const vueImports = pages.map((p) =>
  `import ${vueViewName(p.entry)} from '../views/${vueViewName(p.entry)}.vue';`,
).join('\n');

const vueRoutes = pages.map((p) =>
  `    { path: '${p.path}', name: '${p.entry}', component: ${vueViewName(p.entry)} },`,
).join('\n');

// Group sidebar entries by section
const bySection = {};
for (const p of pages) {
  bySection[p.section] = bySection[p.section] || [];
  bySection[p.section].push(p);
}

console.log(`Generated ${count} React pages + ${count} Vue views.`);
console.log('');
console.log('=== React imports (append to app.tsx) ===');
console.log(reactImports);
console.log('');
console.log('=== React routes (append inside <Routes>) ===');
console.log(reactRoutes);
console.log('');
console.log('=== Vue imports (append to router/index.ts) ===');
console.log(vueImports);
console.log('');
console.log('=== Vue routes (append inside routes: [...]) ===');
console.log(vueRoutes);
console.log('');
console.log('=== Sidebar entries (merge into SECTIONS arrays) ===');
for (const [section, items] of Object.entries(bySection)) {
  console.log(`[${section}]`);
  for (const p of items) {
    console.log(`    { path: '${p.path}', label: '${p.label}' },`);
  }
}
