<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  BsTileManager,
  type BsTileColumnCountChange,
  type MintTile,
  type TileGestureBlocked,
  type TileLayouts,
} from '@mintplayer/vue-bootstrap/tile-manager';
import { BsCheckbox } from '@mintplayer/vue-bootstrap/checkbox';
import { BsSelect } from '@mintplayer/vue-bootstrap/select';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import './TileManagerView.scss';

const STORAGE_KEY = 'tile-manager-demo-layouts-v2';

interface DemoTile extends MintTile {
  title: string;
  body: string;
}

const PANELS: readonly DemoTile[] = [
  { id: 'weather', title: 'Weather', label: 'Weather', body: 'Sunny · 22 °C · 5 km/h NW', defaultSize: { colSpan: 2, rowSpan: 1 } },
  { id: 'inbox', title: 'Inbox', label: 'Inbox', body: '3 unread · 2 starred', defaultSize: { colSpan: 1, rowSpan: 2 } },
  { id: 'stats', title: 'Stats', label: 'Stats', body: '1.2k visits · ↑12% week-over-week' },
  { id: 'calendar', title: 'Calendar', label: 'Calendar', body: 'Next: Standup at 10:00', defaultSize: { colSpan: 2, rowSpan: 1 } },
  { id: 'notes', title: 'Notes', label: 'Notes', body: '“Refactor packer · push v1 by Friday”' },
  { id: 'activity', title: 'Activity', label: 'Activity', body: '7 commits · 2 PRs reviewed today', defaultSize: { colSpan: 4, rowSpan: 1 } },
];

const STACK_OPTIONS = [
  { value: '0', label: 'never' },
  { value: '576', label: '576px' },
  { value: '768', label: '768px' },
];
const GAP_OPTIONS = [
  { value: '4', label: 'tight' },
  { value: '8', label: 'small' },
  { value: '12', label: 'comfortable' },
  { value: '20', label: 'spacious' },
];

const SOURCE = `const layouts = ref<TileLayouts>(JSON.parse(localStorage.getItem('dashboard') ?? '{}'));
watch(layouts, (next) => localStorage.setItem('dashboard', JSON.stringify(next)));

<BsTileManager
  v-model:layouts="layouts"
  :tiles="tiles"
  :stack-below="576"
  :gap="12"
  label="Dashboard"
>
  <template #header="{ tile }">{{ tile.title }}</template>
  <template #content="{ tile }"><div class="tile-body">{{ tile.body }}</div></template>
</BsTileManager>`;

function loadLayouts(): TileLayouts {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

const toggled = (ids: ReadonlySet<string>, id: string): ReadonlySet<string> =>
  ids.has(id) ? new Set([...ids].filter((x) => x !== id)) : new Set([...ids, id]);

const stackBelow = ref('576');
const gap = ref('12');
const editing = ref(true);
const animateReflow = ref(true);
const hidden = ref<ReadonlySet<string>>(new Set());
const locked = ref<ReadonlySet<string>>(new Set());
const layouts = ref<TileLayouts>(loadLayouts());
const columnCount = ref<number | null>(null);
const blocked = ref<TileGestureBlocked | null>(null);

// Host-owned visibility (D9): a hidden panel is simply absent from `tiles`; its stored positions stay.
const tiles = computed(() =>
  PANELS.filter((p) => !hidden.value.has(p.id)).map((p) => (locked.value.has(p.id) ? { ...p, disableMove: true, disableResize: true } : p)),
);
const stackBelowPx = computed(() => Number(stackBelow.value) || null);
const gapPx = computed(() => Number(gap.value) || 12);
const dragMode = computed(() => (editing.value ? 'header' : 'off'));
const resizeMode = computed(() => (editing.value ? 'hover' : 'off'));
const layoutsJson = computed(() => JSON.stringify(layouts.value, null, 2));

watch(layouts, (next) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable (private mode). The demo silently degrades.
  }
});

const onColumnCountChange = (change: BsTileColumnCountChange) => (columnCount.value = change.columnCount);

// The board's width: what `stackBelow` and the column count are resolved against.
const boardRef = ref<HTMLDivElement | null>(null);
const boardWidth = ref<number | null>(null);
let observer: ResizeObserver | null = null;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => (boardWidth.value = Math.round(entry.contentRect.width)));
  if (boardRef.value) observer.observe(boardRef.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="demo-page">
    <h1>Tile manager</h1>
    <p class="text-body-secondary">
      Drag a tile by its header to move it; drag a side / bottom / corner grip to resize. The board
      keeps one layout per column count: rearrange at one width and the other widths keep theirs.
      Below the stack width the tiles stack in one column. Layouts persist to <code>localStorage</code>.
    </p>

    <details class="mb-3">
      <summary>Keyboard shortcuts</summary>
      <ul class="mb-0">
        <li><kbd>Tab</kbd> — focus the board. Exactly one tile is in the tab order, so <kbd>Tab</kbd> again leaves it.</li>
        <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> — focus the previous / next tile in reading order · <kbd>Home</kbd> / <kbd>End</kbd> — first / last</li>
        <li><kbd>M</kbd> — move mode: arrows move the tile one cell · <kbd>R</kbd> — resize mode: arrows grow or shrink it</li>
        <li><kbd>Enter</kbd> — commit · <kbd>Esc</kbd> — restore the layout from before the mode, or cancel a pointer gesture</li>
      </ul>
    </details>

    <div class="tile-demo-controls">
      <div class="control-field">
        <label class="form-label mb-1">Stack below</label>
        <BsSelect v-model="stackBelow" aria-label="Stack below" :options="STACK_OPTIONS" />
      </div>
      <div class="control-field">
        <label class="form-label mb-1">Gap</label>
        <BsSelect v-model="gap" aria-label="Gap" :options="GAP_OPTIONS" />
      </div>
      <BsCheckbox v-model="editing" type="switch">Edit layout</BsCheckbox>
      <BsCheckbox v-model="animateReflow">Animate reflow</BsCheckbox>
    </div>

    <div class="tile-demo-checklist">
      <strong>Panels:</strong>
      <BsCheckbox v-for="panel in PANELS" :key="panel.id" :model-value="!hidden.has(panel.id)" @update:model-value="hidden = toggled(hidden, panel.id)">
        {{ panel.title }}
      </BsCheckbox>
    </div>
    <div class="tile-demo-checklist">
      <strong>Lock:</strong>
      <BsCheckbox v-for="panel in PANELS" :key="panel.id" :model-value="locked.has(panel.id)" @update:model-value="locked = toggled(locked, panel.id)">
        {{ panel.title }}
      </BsCheckbox>
    </div>
    <p class="mb-2">
      Board width: <span class="badge text-bg-secondary">{{ boardWidth ?? '—' }}px</span>
      Columns: <span class="badge text-bg-primary">{{ columnCount ?? '—' }}</span>
    </p>

    <div ref="boardRef">
      <BsTileManager
        v-model:layouts="layouts"
        :tiles="tiles"
        :stack-below="stackBelowPx"
        :gap="gapPx"
        :drag-mode="dragMode"
        :resize-mode="resizeMode"
        :animate-reflow="animateReflow"
        label="Demo dashboard"
        @column-count-change="onColumnCountChange"
        @gesture-blocked="blocked = $event"
      >
        <template #header="{ tile }"><span>{{ tile.title }}</span></template>
        <template #content="{ tile }"><div class="tile-body">{{ tile.body }}</div></template>
      </BsTileManager>
    </div>

    <section class="mt-3">
      <button type="button" class="btn btn-outline-danger btn-sm mb-2" @click="layouts = {}">Reset all widths</button>
      <div v-if="blocked" class="alert alert-warning py-2">
        Last gesture blocked: <code>{{ blocked.id }}</code> — <code>{{ blocked.reason }}</code>
      </div>
      <strong class="d-block mb-1">Stored layouts</strong>
      <BsCodeSnippet :code="layoutsJson" language="json" />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
