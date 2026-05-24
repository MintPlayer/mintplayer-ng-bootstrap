<script setup lang="ts">
import { ref } from 'vue';
import { BsTileManager } from '@mintplayer/vue-bootstrap/tile-manager';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { MintTile, TileLayoutSnapshot } from '@mintplayer/web-components/tile-manager';

const tiles = ref<MintTile[]>([
  { id: 'weather',  position: { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 } },
  { id: 'inbox',    position: { colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 2 } },
  { id: 'stats',    position: { colStart: 4, rowStart: 1, colSpan: 1, rowSpan: 1 } },
  { id: 'calendar', position: { colStart: 1, rowStart: 2, colSpan: 2, rowSpan: 1 } },
]);

const snapshot = ref<TileLayoutSnapshot | null>(null);

function onTilelayoutchange(e: Event) {
  const detail = (e as CustomEvent<TileLayoutSnapshot>).detail;
  if (detail) snapshot.value = detail;
}

const SOURCE = `<BsTileManager
  :tiles="tiles"
  column-count="4"
  drag-mode="header"
  @tilelayoutchange="(e) => snapshot = e.detail">
  <div slot="weather-header">Weather</div>
  <div slot="weather-content">Sunny · 22 °C</div>
  …
</BsTileManager>`;
</script>

<template>
  <div class="demo-page">
    <h1>Tile manager</h1>
    <p class="text-body-secondary">
      CSS-grid dashboard with draggable + resizable tiles. The WC owns
      the layout math (collision-aware reflow via a 2D bin-packer);
      consumers project content into named slots and listen for
      <code>tilelayoutchange</code>.
    </p>

    <section style="height: 400px">
      <h2>4 tiles, 4-column grid</h2>
      <BsTileManager
        :tiles="tiles"
        column-count="4"
        drag-mode="header"
        style="display: block; height: 100%"
        @tilelayoutchange="onTilelayoutchange"
      >
        <div slot="weather-header">Weather</div>
        <div slot="weather-content" class="p-2">Sunny · 22 °C · 5 km/h NW</div>
        <div slot="inbox-header">Inbox</div>
        <div slot="inbox-content" class="p-2">3 unread · 2 starred</div>
        <div slot="stats-header">Stats</div>
        <div slot="stats-content" class="p-2">1.2k visits · ↑12% week-over-week</div>
        <div slot="calendar-header">Calendar</div>
        <div slot="calendar-content" class="p-2">Next: Standup at 10:00</div>
      </BsTileManager>
    </section>

    <section>
      <h2>Latest layout</h2>
      <BsCodeSnippet
        v-if="snapshot"
        :code="JSON.stringify(snapshot, null, 2)"
        language="json"
      />
      <p v-else class="text-body-secondary">Drag a tile to capture a layout.</p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
