import { describe, it, expect, beforeEach } from 'vitest';
import { DragController } from './drag-controller';

function makeRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'qb-condition';
  row.style.position = 'absolute';
  row.style.top = '10px';
  row.style.left = '10px';
  row.style.width = '200px';
  row.style.height = '30px';
  row.textContent = 'source row';
  document.body.appendChild(row);
  return row;
}

function makeSlot(parentId: string, index: number, qbRoot: string): HTMLElement {
  const slot = document.createElement('div');
  slot.setAttribute('data-drop-slot', '');
  slot.dataset['parentId'] = parentId;
  slot.dataset['index'] = String(index);
  slot.dataset['qbRoot'] = qbRoot;
  slot.style.position = 'absolute';
  document.body.appendChild(slot);
  return slot;
}

function pointerEvent(type: string, x: number, y: number): PointerEvent {
  // jsdom's PointerEvent constructor doesn't honour clientX/clientY through
  // standard init; fake via Object.defineProperty.
  const e = new (window.Event as typeof Event)(type) as PointerEvent;
  Object.defineProperties(e, {
    clientX: { value: x, configurable: true },
    clientY: { value: y, configurable: true },
    pointerId: { value: 1, configurable: true },
  });
  return e;
}

describe('DragController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('start() inserts a ghost into document.body', () => {
    const row = makeRow();
    const ctrl = new DragController();
    expect(document.body.querySelectorAll('.qb-drag-ghost').length).toBe(0);
    ctrl.start({
      id: 'c1',
      descendantIds: new Set(['c1']),
      qbRoot: 'qb-1',
      rowElement: row,
    }, pointerEvent('pointerdown', 15, 15));
    expect(document.body.querySelectorAll('.qb-drag-ghost').length).toBe(1);
    expect(ctrl.isActive()).toBe(true);
  });

  it('cancel() removes the ghost and resets state', () => {
    const row = makeRow();
    const ctrl = new DragController();
    ctrl.start({
      id: 'c1',
      descendantIds: new Set(['c1']),
      qbRoot: 'qb-1',
      rowElement: row,
    }, pointerEvent('pointerdown', 0, 0));
    ctrl.cancel();
    expect(document.body.querySelectorAll('.qb-drag-ghost').length).toBe(0);
    expect(ctrl.isActive()).toBe(false);
  });

  it('end() returns the resolved drop target and clears state', () => {
    const row = makeRow();
    const slot = makeSlot('g1', 2, 'qb-1');
    // Position the slot at a known point.
    const slotRect = { left: 100, top: 100, right: 200, bottom: 130, width: 100, height: 30 };
    Object.defineProperty(slot, 'getBoundingClientRect', { value: () => slotRect });
    // Stub elementsFromPoint to return the slot.
    const origEFP = document.elementsFromPoint;
    document.elementsFromPoint = ((_x: number, _y: number) => [slot]) as typeof document.elementsFromPoint;
    try {
      const ctrl = new DragController();
      ctrl.start({
        id: 'c1',
        descendantIds: new Set(['c1']),
        qbRoot: 'qb-1',
        rowElement: row,
      }, pointerEvent('pointerdown', 0, 0));
      ctrl.move(pointerEvent('pointermove', 150, 115));
      const target = ctrl.end(pointerEvent('pointerup', 150, 115));
      expect(target).toEqual({ parentId: 'g1', index: 2, qbRoot: 'qb-1' });
      expect(ctrl.isActive()).toBe(false);
    } finally {
      document.elementsFromPoint = origEFP;
    }
  });

  it('rejects a drop into the source\'s own descendant (cycle prevention)', () => {
    const row = makeRow();
    const slot = makeSlot('g-self', 0, 'qb-1');
    const origEFP = document.elementsFromPoint;
    document.elementsFromPoint = ((_x: number, _y: number) => [slot]) as typeof document.elementsFromPoint;
    try {
      const ctrl = new DragController();
      ctrl.start({
        id: 'g-self',
        descendantIds: new Set(['g-self', 'inner']),
        qbRoot: 'qb-1',
        rowElement: row,
      }, pointerEvent('pointerdown', 0, 0));
      ctrl.move(pointerEvent('pointermove', 50, 50));
      const target = ctrl.end(pointerEvent('pointerup', 50, 50));
      expect(target).toBeNull();
    } finally {
      document.elementsFromPoint = origEFP;
    }
  });

  it('returns a cross-tree drop target when the slot is in a different qbRoot', () => {
    const row = makeRow();
    const slot = makeSlot('g-other', 1, 'qb-OTHER');
    const origEFP = document.elementsFromPoint;
    document.elementsFromPoint = ((_x: number, _y: number) => [slot]) as typeof document.elementsFromPoint;
    try {
      const ctrl = new DragController();
      ctrl.start({
        id: 'c1',
        descendantIds: new Set(['c1']),
        qbRoot: 'qb-1',
        rowElement: row,
      }, pointerEvent('pointerdown', 0, 0));
      ctrl.move(pointerEvent('pointermove', 50, 50));
      const target = ctrl.end(pointerEvent('pointerup', 50, 50));
      expect(target).toEqual({ parentId: 'g-other', index: 1, qbRoot: 'qb-OTHER' });
    } finally {
      document.elementsFromPoint = origEFP;
    }
  });

  function startedWithHits(hits: Element[], descendantIds = new Set(['c1'])): DragController {
    const ctrl = new DragController();
    // The private elementsAt seam answers "what is under the pointer" — no geometry is faked.
    (ctrl as unknown as { elementsAt: () => Element[] }).elementsAt = () => hits;
    ctrl.start({ id: 'c1', descendantIds, qbRoot: 'qb-1', rowElement: makeRow() }, pointerEvent('pointerdown', 15, 15));
    return ctrl;
  }

  it('resolves a slot from a descendant under the pointer via its closest [data-drop-slot]', () => {
    const slot = makeSlot('g1', 3, 'qb-1');
    const label = document.createElement('span');
    slot.appendChild(label);
    const ctrl = startedWithHits([label]);
    ctrl.move(pointerEvent('pointermove', 1, 1));
    expect(ctrl.currentTarget()).toEqual({ parentId: 'g1', index: 3, qbRoot: 'qb-1' });
  });

  it('skips non-slot elements, incomplete slots and cycle slots, taking the first valid one beneath', () => {
    const plain = document.createElement('div');
    const incomplete = makeSlot('g-x', 0, 'qb-1');
    delete incomplete.dataset['qbRoot'];
    const cycle = makeSlot('c1', 0, 'qb-1');
    const valid = makeSlot('g2', 1, 'qb-1');
    const ctrl = startedWithHits([plain, incomplete, cycle, valid]);
    ctrl.move(pointerEvent('pointermove', 1, 1));
    expect(ctrl.currentTarget()).toEqual({ parentId: 'g2', index: 1, qbRoot: 'qb-1' });
  });

  it('the ghost follows the pointer, keeping the grab offset', () => {
    const ctrl = startedWithHits([]);
    const ghost = document.querySelector('.qb-drag-ghost') as HTMLElement;
    ctrl.move(pointerEvent('pointermove', 115, 65));
    // Grabbed 15px into the row (jsdom reports the row at 0,0), so the ghost trails by 15px.
    expect([ghost.style.left, ghost.style.top]).toEqual(['100px', '50px']);
  });

  it('a later move over nothing clears the previously resolved target', () => {
    const slot = makeSlot('g1', 0, 'qb-1');
    const hits: Element[] = [slot];
    const ctrl = startedWithHits(hits);
    ctrl.move(pointerEvent('pointermove', 1, 1));
    hits.length = 0;
    ctrl.move(pointerEvent('pointermove', 2, 2));
    expect(ctrl.end(pointerEvent('pointerup', 2, 2))).toBeNull();
  });

  it('move() and end() before start() do nothing and resolve nothing', () => {
    const ctrl = new DragController();
    ctrl.move(pointerEvent('pointermove', 1, 1));
    expect(ctrl.currentTarget()).toBeNull();
    expect(ctrl.end(pointerEvent('pointerup', 1, 1))).toBeNull();
    expect(ctrl.source()).toBeNull();
  });

  it('elementsAt descends one level into a shadow host under the pointer', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const slot = document.createElement('div');
    slot.setAttribute('data-drop-slot', '');
    Object.assign(slot.dataset, { parentId: 'g-in', index: '0', qbRoot: 'qb-in' });
    shadow.appendChild(slot);
    const origEFP = document.elementsFromPoint;
    document.elementsFromPoint = (() => [host, host]) as typeof document.elementsFromPoint;
    (shadow as unknown as { elementFromPoint: () => Element }).elementFromPoint = () => slot;
    try {
      const ctrl = new DragController();
      ctrl.start({ id: 'c1', descendantIds: new Set(['c1']), qbRoot: 'qb-1', rowElement: makeRow() }, pointerEvent('pointerdown', 0, 0));
      ctrl.move(pointerEvent('pointermove', 5, 5));
      expect(ctrl.currentTarget()).toEqual({ parentId: 'g-in', index: 0, qbRoot: 'qb-in' });
    } finally {
      document.elementsFromPoint = origEFP;
    }
  });

  it('returns null when no drop slot is under the pointer', () => {
    const row = makeRow();
    const origEFP = document.elementsFromPoint;
    document.elementsFromPoint = ((_x: number, _y: number) => []) as typeof document.elementsFromPoint;
    try {
      const ctrl = new DragController();
      ctrl.start({
        id: 'c1',
        descendantIds: new Set(['c1']),
        qbRoot: 'qb-1',
        rowElement: row,
      }, pointerEvent('pointerdown', 0, 0));
      ctrl.move(pointerEvent('pointermove', 50, 50));
      const target = ctrl.end(pointerEvent('pointerup', 50, 50));
      expect(target).toBeNull();
    } finally {
      document.elementsFromPoint = origEFP;
    }
  });
});
