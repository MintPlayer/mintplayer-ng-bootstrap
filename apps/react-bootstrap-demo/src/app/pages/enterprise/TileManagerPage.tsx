import { useState } from 'react';
import { BsTileManager } from '@mintplayer/react-bootstrap/tile-manager';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type {
  MintTile,
  TileLayoutSnapshot,
  TilePosition,
} from '@mintplayer/web-components/tile-manager';

const INITIAL_TILES: MintTile[] = [
  { id: 'weather',  position: { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 } },
  { id: 'inbox',    position: { colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 2 } },
  { id: 'stats',    position: { colStart: 4, rowStart: 1, colSpan: 1, rowSpan: 1 } },
  { id: 'calendar', position: { colStart: 1, rowStart: 2, colSpan: 2, rowSpan: 1 } },
];

const SOURCE = `<BsTileManager
  tiles={tiles}
  column-count={4}
  drag-mode="header"
  onTilelayoutchange={e => setSnapshot(e.detail)}>
  <div slot="weather-header">Weather</div>
  <div slot="weather-content">Sunny · 22 °C</div>
  …
</BsTileManager>`;

export function TileManagerPage() {
  // `tiles` must be reactive: @lit/react re-applies every prop on every
  // render, so any parent re-render (e.g., to refresh the snapshot panel)
  // would push the original `tiles` array back into the WC and snap the
  // user's drag/resize back to seed positions. Listen for
  // `tilepositionchange` and replay each commit into state.
  const [tiles, setTiles] = useState<MintTile[]>(INITIAL_TILES);
  const [snapshot, setSnapshot] = useState<TileLayoutSnapshot | null>(null);

  const onTilepositionchange = (e: CustomEvent<{ id: string; position: TilePosition }>) => {
    const { id, position } = e.detail;
    setTiles((current) => current.map((t) => (t.id === id ? { ...t, position } : t)));
  };

  return (
    <div className="demo-page">
      <h1>Tile manager</h1>
      <p className="text-body-secondary">
        CSS-grid dashboard with draggable + resizable tiles. The WC owns
        the layout math (collision-aware reflow via a 2D bin-packer);
        consumers project content into named slots and listen for
        <code> tilelayoutchange</code>.
      </p>

      <details className="mb-2">
        <summary>Keyboard shortcuts</summary>
        <ul className="mb-0">
          <li><kbd>Tab</kbd> — focus the tile board. Exactly one tile is in the tab order (roving tabindex), so <kbd>Tab</kbd> again leaves the board.</li>
          <li><kbd>→</kbd> / <kbd>↓</kbd> — focus the next tile · <kbd>←</kbd> / <kbd>↑</kbd> — the previous one. The order is row-major (top-to-bottom, then left-to-right) and it wraps around the ends; the arrows step through that sequence rather than moving geometrically, so <kbd>↓</kbd> does not necessarily land on the tile below.</li>
          <li><kbd>Home</kbd> / <kbd>End</kbd> — first / last tile in row-major order</li>
          <li><kbd>M</kbd> — enter move mode on the focused tile. Ignored on a tile that has both <code>disableMove</code> and <code>disableResize</code>.</li>
          <li>In move mode: <kbd>↑</kbd> / <kbd>↓</kbd> / <kbd>←</kbd> / <kbd>→</kbd> move the tile by one grid cell, <kbd>Shift</kbd> + arrow grows or shrinks its span by one column / row. Each step reflows the other tiles through the packer and emits <code>tilelayoutchange</code>; a step the packer can't place is announced as “Move blocked” and changes nothing.</li>
          <li><kbd>Enter</kbd> — commit and leave move mode · <kbd>Esc</kbd> — leave move mode and restore the layout as it was when move mode was entered</li>
          <li><kbd>Esc</kbd> during a pointer drag or resize — cancel that gesture</li>
        </ul>
      </details>

      <section style={{ height: 400 }}>
        <h2>4 tiles, 4-column grid</h2>
        <BsTileManager
          {...{ tiles, 'column-count': 4, 'drag-mode': 'header' } as React.ComponentProps<typeof BsTileManager>}
          onTilelayoutchange={(e) => setSnapshot(e.detail)}
          onTilepositionchange={onTilepositionchange}
          style={{ display: 'block', height: '100%' }}
        >
          <div slot="weather-header">Weather</div>
          <div slot="weather-content" className="p-2">Sunny · 22 °C · 5 km/h NW</div>
          <div slot="inbox-header">Inbox</div>
          <div slot="inbox-content" className="p-2">3 unread · 2 starred</div>
          <div slot="stats-header">Stats</div>
          <div slot="stats-content" className="p-2">1.2k visits · ↑12% week-over-week</div>
          <div slot="calendar-header">Calendar</div>
          <div slot="calendar-content" className="p-2">Next: Standup at 10:00</div>
        </BsTileManager>
      </section>

      <section>
        <h2>Latest layout</h2>
        {snapshot
          ? <BsCodeSnippet code={JSON.stringify(snapshot, null, 2)} language="json" />
          : <p className="text-body-secondary">Drag a tile to capture a layout.</p>}
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
