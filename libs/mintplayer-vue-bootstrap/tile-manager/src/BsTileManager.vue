<script setup lang="ts" generic="T extends MintTile">
/**
 * Tile manager: a dashboard grid whose tiles the user moves and resizes, with one layout per
 * column count (#440).
 *
 * The Vue front of `TileManagerMachine` (`@mintplayer/ui-core/tile-manager`). Every decision
 * (layout per column count, gestures, keyboard, ARIA) is the machine's; this component renders
 * its own template from `connect()`'s bags, measures the grid, owns pointer capture and the FLIP
 * animation, and turns the machine's events into emits. Consumer attributes land on the board,
 * whose `region` role is part of the contract.
 *
 * SSR: until the first measure the board carries a `<style>` with the `@container` rules that
 * place every tile at every column count (D14), so the server HTML paints the right layout with
 * no JS. No-JS tier 2: before the first measure the tiles are named groups with no tab stop or
 * grips.
 */
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useId, watch } from 'vue';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  breakpointCss,
  connect,
  DEFAULT_GAP,
  DEFAULT_MIN_COLUMN_WIDTH,
  gridPointer,
  readCellMetrics,
  TILE_MANAGER_SCOPE,
  TileFlip,
  TileManagerMachine,
  tileManagerScopedStyles,
  type MintTile,
  type TileBreakpoint,
  type TileDragMode,
  type TileGestureBlocked,
  type TileLayoutChange,
  type TileLayouts,
  type TileLayoutSnapshot,
  type TileManagerMessages,
  type TilePart,
  type TileResizeMode,
} from '@mintplayer/ui-core/tile-manager';
import { useMachine } from '../../machine/src/useMachine';
import { vueProps, vueStyle } from '../../machine/src/vue-props';
import type { BsTileColumnCountChange } from './types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** The visible tiles, in DOM order. */
    tiles?: readonly T[];
    /** Explicit `{ minWidth, columns }` map. Wins over `stackBelow` and the generated map. */
    breakpoints?: readonly TileBreakpoint[] | null;
    /** px. Below this width the tiles stack in one column. */
    stackBelow?: number | null;
    /** Upper bound of the generated map when `layouts` is empty. */
    maxColumns?: number;
    /** px. No column is narrower than this, except at one column. */
    minColumnWidth?: number;
    /** CSS length of one grid row. */
    minRowHeight?: string;
    /** px between tiles. */
    gap?: number;
    dragMode?: TileDragMode;
    resizeMode?: TileResizeMode;
    /** Animate tiles to their new place when the layout reflows. Off under reduced motion. */
    animateReflow?: boolean;
    /** Accessible name of the board. An `aria-label` / `aria-labelledby` attribute wins. */
    label?: string | null;
    /** Localized strings for the board's descriptions and announcements. */
    messages?: Partial<TileManagerMessages>;
  }>(),
  {
    tiles: () => [],
    breakpoints: null,
    stackBelow: null,
    maxColumns: 6,
    minColumnWidth: DEFAULT_MIN_COLUMN_WIDTH,
    minRowHeight: '8rem',
    gap: DEFAULT_GAP,
    dragMode: 'header',
    resizeMode: 'hover',
    animateReflow: true,
    label: null,
    messages: () => ({}),
  },
);

/** One layout per column count; a commit writes the full next record. */
const layouts = defineModel<TileLayouts>('layouts', { default: () => ({}) });

const emit = defineEmits<{
  /** Each step of a gesture or keyboard move: the layout as it would be committed. */
  layoutPreview: [change: TileLayoutChange];
  /** A commit, with the full layouts record and the stale narrower counts (D15). */
  layoutChange: [change: TileLayoutChange];
  columnCountChange: [change: BsTileColumnCountChange];
  gestureBlocked: [blocked: TileGestureBlocked];
}>();

defineSlots<{
  header?(props: { tile: T }): unknown;
  content?(props: { tile: T }): unknown;
}>();

const id = `bs-tile-manager-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

// Every input goes in at construction, so the server render and the first client render agree.
const [machine, state] = useMachine(() => {
  const created = new TileManagerMachine({ vibrate: (ms) => navigator.vibrate?.(ms) });
  created.setInputs({
    tiles: props.tiles,
    layouts: layouts.value,
    breakpoints: props.breakpoints,
    stackBelow: props.stackBelow,
    maxColumns: props.maxColumns,
    minColumnWidth: props.minColumnWidth,
    minRowHeight: props.minRowHeight,
    gap: props.gap,
    dragMode: props.dragMode,
    resizeMode: props.resizeMode,
    label: props.label,
    messages: props.messages,
  });
  return created;
});

installLightStyles(TILE_MANAGER_SCOPE, tileManagerScopedStyles);

// Props → machine. One watch per input, so an unrelated prop change never re-pushes a stale
// `layouts` over the layout the machine just committed (S3).
watch(() => props.tiles, (tiles) => machine.setInputs({ tiles }));
watch(() => props.breakpoints, (breakpoints) => machine.setInputs({ breakpoints }));
watch(() => props.stackBelow, (stackBelow) => machine.setInputs({ stackBelow }));
watch(() => props.maxColumns, (maxColumns) => machine.setInputs({ maxColumns }));
watch(() => props.minColumnWidth, (minColumnWidth) => machine.setInputs({ minColumnWidth }));
watch(() => props.minRowHeight, (minRowHeight) => machine.setInputs({ minRowHeight }));
watch(() => props.gap, (gap) => machine.setInputs({ gap }));
watch(() => props.dragMode, (dragMode) => machine.setInputs({ dragMode }));
watch(() => props.resizeMode, (resizeMode) => machine.setInputs({ resizeMode }));
watch(() => props.label, (label) => machine.setInputs({ label }));
watch(() => props.messages, (messages) => machine.setInputs({ messages }));
// A consumer write to `v-model:layouts`, not the echo of our own commit.
watch(layouts, (next) => {
  if (next !== machine.snapshot.layouts) machine.setInputs({ layouts: next });
});

const offEvent = machine.onEvent((e) => {
  const { type, ...detail } = e;
  switch (type) {
    case 'layoutchange': {
      const change = detail as TileLayoutChange;
      layouts.value = change.layouts;
      emit('layoutChange', change);
      break;
    }
    case 'layoutpreview':
      emit('layoutPreview', detail as TileLayoutChange);
      break;
    case 'columncountchange':
      emit('columnCountChange', detail as BsTileColumnCountChange);
      break;
    case 'gestureblocked':
      emit('gestureBlocked', detail as TileGestureBlocked);
      break;
  }
});

const boardRef = ref<HTMLDivElement | null>(null);
const gridRef = ref<HTMLDivElement | null>(null);
const flip = new TileFlip();
let flipPending = false;
let focusSeq = 0;
let lastRendered: TileLayoutSnapshot | null = null;

// FLIP "first": read in the store notification, before Vue's scheduler writes the new positions.
const offFirst = machine.subscribe(() => {
  const rendered = machine.rendered;
  if (rendered === lastRendered) return;
  lastRendered = rendered;
  if (gridRef.value && props.animateReflow && machine.snapshot.measured) {
    flip.first(gridRef.value);
    flipPending = true;
  }
});

// FLIP "play" and the machine's focus requests, once the new DOM is patched.
watch(
  state,
  (snapshot) => {
    if (flipPending && gridRef.value) {
      flipPending = false;
      flip.play(gridRef.value, snapshot.gesture.kind === 'drag' ? snapshot.gesture.tileId : null);
    }
    if (snapshot.focusRequest && snapshot.focusRequest.seq !== focusSeq) {
      focusSeq = snapshot.focusRequest.seq;
      boardRef.value?.querySelector<HTMLElement>(`[data-tile-id="${CSS.escape(snapshot.focusRequest.tileId)}"]`)?.focus();
    }
  },
  { flush: 'post' },
);

// One observer on the grid; `measure` runs in the next frame, never inside the callback (S2).
let observer: ResizeObserver | null = null;
let frame = 0;
const onVisibilityChange = () => {
  if (document.visibilityState === 'hidden') machine.cancelGesture();
};
onMounted(() => {
  const grid = gridRef.value;
  if (!grid || typeof ResizeObserver === 'undefined') return;
  let width = 0;
  observer = new ResizeObserver((entries) => {
    const entry = entries[entries.length - 1];
    width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      machine.measure(width);
    });
  });
  observer.observe(grid);
  document.addEventListener('visibilitychange', onVisibilityChange);
});
onBeforeUnmount(() => {
  offEvent();
  offFirst();
  observer?.disconnect();
  cancelAnimationFrame(frame);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});

function down(e: PointerEvent, tileId: string, part: TilePart): void {
  const grid = gridRef.value;
  if (!grid) return;
  const verdict = machine.pointerDown(tileId, part, gridPointer(e, grid), readCellMetrics(grid, machine.snapshot.columnCount));
  if (verdict === 'capture') {
    e.preventDefault();
    (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-tile-id]')?.setPointerCapture(e.pointerId);
  }
}
function move(e: PointerEvent): void {
  const grid = gridRef.value;
  if (grid && machine.pointerMove(gridPointer(e, grid)) === 'capture') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function keydown(e: KeyboardEvent, tileId: string): void {
  if (machine.keydown(tileId, e.key, { shift: e.shiftKey })) e.preventDefault();
}

const api = computed(() => {
  void state.value;
  return connect(machine, id);
});
const tileById = computed(() => new Map(props.tiles.map((t) => [t.id, t])));
const layoutCss = computed(() => (state.value.measured ? null : breakpointCss(state.value.layouts, state.value.tiles, state.value, id)));

// Consumer attrs on the board: `role` is the region contract's, `aria-describedby` merges with
// the board's own, `class` / `style` merge. `useAttrs()` is not reactive for computed(), so this
// is read in the template (render-time).
const consumerAttrs = useAttrs();
function boardBindings(): Record<string, unknown> {
  const { role: _role, class: consumerClass, style: consumerStyle, 'aria-describedby': describedBy, ...rest } = consumerAttrs;
  const { class: boardClass, 'aria-describedby': boardDescribedBy, ...boardAttrs } = api.value.board.attrs;
  return {
    ...vueProps(boardAttrs),
    ...rest,
    class: ['mp-tile-manager', boardClass, consumerClass],
    style: [vueStyle(api.value.board.style), consumerStyle],
    'aria-describedby': [boardDescribedBy, describedBy].filter(Boolean).join(' ') || undefined,
  };
}

defineExpose({
  /** What is rendered: the resolved column count and its layout (the preview while editing). */
  captureLayout: (): { columnCount: number; layout: TileLayoutSnapshot } => ({
    columnCount: machine.snapshot.columnCount,
    layout: machine.rendered.map((p) => ({ id: p.id, position: { ...p.position } })),
  }),
  /** Drops `layouts[count]` and commits, so that count derives again (D15). */
  resetLayout: (count: number): void => machine.resetLayout(count),
  /** True while a pointer drag or resize is in flight. */
  isGestureActive: (): boolean => {
    const kind = machine.snapshot.gesture.kind;
    return kind === 'drag' || kind === 'resize';
  },
});
</script>

<template>
  <div ref="boardRef" v-bind="boardBindings()" role="region">
    <component :is="'style'" v-if="layoutCss">{{ layoutCss }}</component>
    <div class="tile-container" v-bind="vueProps(api.container)">
      <div ref="gridRef" class="tile-grid" v-bind="vueProps(api.grid.attrs)" :style="vueStyle(api.grid.style)">
        <!-- A press on the header or a grip bubbles to the tile's body handler; the machine
             ignores that second pointerdown for the same pointer, so the innermost part decides. -->
        <div
          v-for="t in api.tiles"
          :key="t.id"
          class="tile"
          v-bind="vueProps(t.attrs)"
          :style="vueStyle(t.style)"
          @pointerdown="down($event, t.id, 'body')"
          @pointermove="move"
          @pointerup="machine.pointerUp($event)"
          @pointercancel="machine.pointerCancel($event)"
          @lostpointercapture="machine.pointerCancel($event)"
          @keydown="keydown($event, t.id)"
          @focus="machine.focus(t.id)"
          @blur="machine.blur(t.id)"
        >
          <div class="tile-header" v-bind="vueProps(t.header)" @pointerdown="down($event, t.id, 'header')">
            <slot v-if="tileById.get(t.id)" name="header" :tile="tileById.get(t.id)!" />
          </div>
          <div class="tile-content" v-bind="vueProps(t.content)">
            <slot v-if="tileById.get(t.id)" name="content" :tile="tileById.get(t.id)!" />
          </div>
          <span
            v-for="g in t.grips"
            :key="g.handle"
            class="tile-grip"
            v-bind="vueProps(g.attrs)"
            @pointerdown="down($event, t.id, g.handle)"
          />
        </div>
      </div>
    </div>
    <div v-for="n in api.descriptions" :key="n.key" class="tile-sr-only" v-bind="vueProps(n.attrs)">{{ n.text }}</div>
    <span class="tile-sr-only" v-bind="vueProps(api.live.attrs)">{{ api.live.text }}</span>
  </div>
</template>
