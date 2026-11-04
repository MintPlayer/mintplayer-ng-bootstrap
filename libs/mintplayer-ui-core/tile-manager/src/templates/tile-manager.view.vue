<script setup lang="ts">
// The tile manager (#458 M4): the board, its query container, the grid of tiles
// (header and content are the consumer's scoped slots, the grips the core's),
// then the descriptions and the live region. Until the first measure the tiles
// carry no inline position: <instance-style> renders the @container rules that
// place them at every column count (D14).
import type { MintTile, TileManagerView } from '@mintplayer/ui-core/tile-manager';

defineProps<{ view: TileManagerView }>();
defineSlots<{
  header?: (args: { tile: MintTile }) => unknown;
  content?: (args: { tile: MintTile }) => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.board">
    <instance-style :name="view.layoutCssName" :css="view.layoutCss" />
    <div v-bind="view.container" :style="view.containerStyle">
      <div v-bind="view.grid" :style="view.gridStyle">
        <div v-for="t in view.tiles" :key="t.id" v-bind="t.attrs" :style="t.style">
          <div v-bind="t.header"><slot name="header" :tile="t.tile" /></div>
          <div v-bind="t.content"><slot name="content" :tile="t.tile" /></div>
          <span v-for="g in t.grips" :key="g.handle" v-bind="g.attrs"></span>
        </div>
      </div>
    </div>
    <div v-for="n in view.descriptions" :key="n.key" v-bind="n.attrs">{{ n.text }}</div>
    <span v-bind="view.live.attrs">{{ view.live.text }}</span>
  </div>
</template>
