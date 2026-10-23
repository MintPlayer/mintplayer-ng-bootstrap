import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BsTileManager,
  type MintTile,
  type TileGestureBlocked,
  type TileLayouts,
} from '@mintplayer/react-bootstrap/tile-manager';
import { BsCheckbox } from '@mintplayer/react-bootstrap/checkbox';
import { BsSelect } from '@mintplayer/react-bootstrap/select';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import './TileManagerPage.scss';

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

const SOURCE = `const [layouts, setLayouts] = useState<TileLayouts>(
  () => JSON.parse(localStorage.getItem('dashboard') ?? '{}'),
);
useEffect(() => localStorage.setItem('dashboard', JSON.stringify(layouts)), [layouts]);

<BsTileManager
  tiles={tiles}
  layouts={layouts}
  onLayoutsChange={setLayouts}
  stackBelow={576}
  gap={12}
  label="Dashboard"
  renderHeader={(tile) => tile.title}
  renderContent={(tile) => <div className="tile-body">{tile.body}</div>}
/>`;

function loadLayouts(): TileLayouts {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

const toggled = (ids: ReadonlySet<string>, id: string): ReadonlySet<string> =>
  ids.has(id) ? new Set([...ids].filter((x) => x !== id)) : new Set([...ids, id]);

export function TileManagerPage() {
  const [stackBelow, setStackBelow] = useState(576);
  const [gap, setGap] = useState(12);
  const [editing, setEditing] = useState(true);
  const [animateReflow, setAnimateReflow] = useState(true);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [locked, setLocked] = useState<ReadonlySet<string>>(new Set());
  const [layouts, setLayouts] = useState<TileLayouts>(loadLayouts);
  const [columnCount, setColumnCount] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<TileGestureBlocked | null>(null);
  // The board's width: what `stackBelow` and the column count are resolved against.
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number | null>(null);

  // Host-owned visibility (D9): a hidden panel is simply absent from `tiles`; its stored positions stay.
  const tiles = useMemo(
    () => PANELS.filter((p) => !hidden.has(p.id)).map((p) => (locked.has(p.id) ? { ...p, disableMove: true, disableResize: true } : p)),
    [hidden, locked],
  );
  const layoutsJson = useMemo(() => JSON.stringify(layouts, null, 2), [layouts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch {
      // localStorage may be unavailable (private mode). The demo silently degrades.
    }
  }, [layouts]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setBoardWidth(Math.round(entry.contentRect.width)));
    if (boardRef.current) observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="demo-page">
      <h1>Tile manager</h1>
      <p className="text-body-secondary">
        Drag a tile by its header to move it; drag a side / bottom / corner grip to resize. The board
        keeps one layout per column count: rearrange at one width and the other widths keep theirs.
        Below the stack width the tiles stack in one column. Layouts persist to <code>localStorage</code>.
      </p>

      <details className="mb-3">
        <summary>Keyboard shortcuts</summary>
        <ul className="mb-0">
          <li><kbd>Tab</kbd> — focus the board. Exactly one tile is in the tab order, so <kbd>Tab</kbd> again leaves it.</li>
          <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> — focus the previous / next tile in reading order · <kbd>Home</kbd> / <kbd>End</kbd> — first / last</li>
          <li><kbd>M</kbd> — move mode: arrows move the tile one cell · <kbd>R</kbd> — resize mode: arrows grow or shrink it</li>
          <li><kbd>Enter</kbd> — commit · <kbd>Esc</kbd> — restore the layout from before the mode, or cancel a pointer gesture</li>
        </ul>
      </details>

      <div className="tile-demo-controls">
        <div className="control-field">
          <label className="form-label mb-1">Stack below</label>
          <BsSelect aria-label="Stack below" value={String(stackBelow)} options={STACK_OPTIONS} onValueChange={(e) => setStackBelow(Number(e.detail.value ?? 0))} />
        </div>
        <div className="control-field">
          <label className="form-label mb-1">Gap</label>
          <BsSelect aria-label="Gap" value={String(gap)} options={GAP_OPTIONS} onValueChange={(e) => setGap(Number(e.detail.value ?? 12))} />
        </div>
        <BsCheckbox type="switch" checked={editing} onChange={(e) => setEditing(e.detail.checked)}>Edit layout</BsCheckbox>
        <BsCheckbox type="checkbox" checked={animateReflow} onChange={(e) => setAnimateReflow(e.detail.checked)}>Animate reflow</BsCheckbox>
      </div>

      <div className="tile-demo-checklist">
        <strong>Panels:</strong>
        {PANELS.map((panel) => (
          <BsCheckbox key={panel.id} type="checkbox" checked={!hidden.has(panel.id)} onChange={() => setHidden((ids) => toggled(ids, panel.id))}>
            {panel.title}
          </BsCheckbox>
        ))}
      </div>
      <div className="tile-demo-checklist">
        <strong>Lock:</strong>
        {PANELS.map((panel) => (
          <BsCheckbox key={panel.id} type="checkbox" checked={locked.has(panel.id)} onChange={() => setLocked((ids) => toggled(ids, panel.id))}>
            {panel.title}
          </BsCheckbox>
        ))}
      </div>
      <p className="mb-2">
        Board width: <span className="badge text-bg-secondary">{boardWidth ?? '—'}px</span>
        Columns: <span className="badge text-bg-primary">{columnCount ?? '—'}</span>
      </p>

      <div ref={boardRef}>
        <BsTileManager
          tiles={tiles}
          layouts={layouts}
          onLayoutsChange={setLayouts}
          stackBelow={stackBelow || null}
          gap={gap}
          dragMode={editing ? 'header' : 'off'}
          resizeMode={editing ? 'hover' : 'off'}
          animateReflow={animateReflow}
          label="Demo dashboard"
          onColumnCountChange={(change) => setColumnCount(change.columnCount)}
          onGestureBlocked={setBlocked}
          renderHeader={(tile) => <span>{tile.title}</span>}
          renderContent={(tile) => <div className="tile-body">{tile.body}</div>}
        />
      </div>

      <section className="mt-3">
        <button type="button" className="btn btn-outline-danger btn-sm mb-2" onClick={() => setLayouts({})}>Reset all widths</button>
        {blocked && (
          <div className="alert alert-warning py-2">
            Last gesture blocked: <code>{blocked.id}</code> — <code>{blocked.reason}</code>
          </div>
        )}
        <strong className="d-block mb-1">Stored layouts</strong>
        <BsCodeSnippet code={layoutsJson} language="json" />
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
