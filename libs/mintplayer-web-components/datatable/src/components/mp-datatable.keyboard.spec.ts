import { beforeEach, describe, expect, it } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';

/**
 * Keyboard operability for `<mp-datatable>` — the audit's largest pointer-only
 * cluster: sort lived on a `<th @click>`, resize on a pointerdown-only handle,
 * and rows could not be reached at all.
 *
 * As everywhere in this suite: activation of native buttons by real Enter/Space
 * is UA behaviour that untrusted events cannot trigger, so those paths assert
 * the click the activation feeds into; the keypress itself is e2e material.
 */
interface Row { id: number; name: string; }

const DATA: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
  { id: 3, name: 'Gamma' },
];

async function mount(attrs = ''): Promise<MpDatatable> {
  document.body.innerHTML = `<mp-datatable ${attrs}></mp-datatable>`;
  const el = document.querySelector('mp-datatable') as MpDatatable;
  (el as unknown as { columns: unknown }).columns = [
    { name: 'name', label: 'Name' },
  ];
  (el as unknown as { data: unknown }).data = DATA;
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
  return el;
}

// Tier L: mp-datatable renders in the light DOM, so its render root IS the
// host. Kept under the original name so the specs read unchanged.
const shadow = (el: MpDatatable) => el.renderRoot as unknown as ParentNode;
const key = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true, ...init });
  target.dispatchEvent(ev);
  return ev;
};

describe('mp-datatable keyboard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('sortable headers render a REAL <button>, so sort is focusable and activatable', async () => {
    const el = await mount();
    const button = shadow(el).querySelector<HTMLButtonElement>('th button.header-sort');
    expect(button).not.toBeNull();

    button!.click();
    await el.updateComplete;
    expect(shadow(el).querySelector('th')!.getAttribute('aria-sort')).toBe('ascending');
  });

  it('non-sortable headers render no button — nothing focusable that does nothing', async () => {
    const el = await mount();
    (el as unknown as { columns: unknown }).columns = [{ name: 'name', label: 'Name', sortable: false }];
    await el.updateComplete;
    expect(shadow(el).querySelector('th button.header-sort')).toBeNull();
  });

  it('the resize handle is focusable and ArrowLeft/Right resize with the pointer path floor', async () => {
    const el = await mount('resizable-columns');
    const handle = shadow(el).querySelector<HTMLElement>('.resize-handle')!;
    expect(handle.getAttribute('tabindex')).toBe('0');

    key(handle, 'ArrowRight');
    await el.updateComplete;
    const grown = shadow(el).querySelector<HTMLElement>('th')!.style.width;
    expect(grown).toMatch(/px$/);

    // Shrink far below the floor: clamps at 40, the same clamp as pointer drags.
    for (let i = 0; i < 60; i++) key(shadow(el).querySelector<HTMLElement>('.resize-handle')!, 'ArrowLeft');
    await el.updateComplete;
    expect(shadow(el).querySelector<HTMLElement>('th')!.style.width).toBe('40px');
  });

  it('rows carry a roving tab stop when selectable (exactly one tabindex="0")', async () => {
    const el = await mount('selection-mode="single"');
    const rows = Array.from(shadow(el).querySelectorAll<HTMLElement>('tbody tr[data-row-key]'));
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(rows.filter((r) => r.getAttribute('tabindex') === '-1')).toHaveLength(2);
  });

  it('rows are NOT focusable when selection is off — no dead tab stops', async () => {
    const el = await mount();
    const rows = Array.from(shadow(el).querySelectorAll<HTMLElement>('tbody tr[data-row-key]'));
    expect(rows.every((r) => !r.hasAttribute('tabindex'))).toBe(true);
  });

  it('ArrowDown/ArrowUp move focus between rows', async () => {
    const el = await mount('selection-mode="single"');
    const rows = Array.from(shadow(el).querySelectorAll<HTMLElement>('tbody tr[data-row-key]'));
    rows[0].focus();

    key(rows[0], 'ArrowDown');
    expect(document.activeElement).toBe(shadow(el).querySelectorAll('tbody tr[data-row-key]')[1]);

    key(document.activeElement as HTMLElement, 'ArrowUp');
    expect(document.activeElement).toBe(shadow(el).querySelectorAll('tbody tr[data-row-key]')[0]);
  });

  it('Enter selects the focused row in single mode and emits both events', async () => {
    const el = await mount('selection-mode="single"');
    const selections: unknown[] = [];
    const clicks: unknown[] = [];
    el.addEventListener('mp-datatable-selection-change', (e) => selections.push((e as CustomEvent).detail));
    el.addEventListener('mp-datatable-row-click', (e) => clicks.push((e as CustomEvent).detail));

    const row = shadow(el).querySelector<HTMLElement>('tbody tr[data-row-key]')!;
    row.focus();
    const ev = key(row, 'Enter');
    await el.updateComplete;

    expect(ev.defaultPrevented).toBe(true);
    expect(selections).toHaveLength(1);
    expect(clicks).toHaveLength(1);
    // Re-query: repeat() may have re-rendered the row after the state change.
    expect(
      shadow(el).querySelector('tbody tr[data-row-key]')!.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('Shift+Space ranges from the last non-shift selection, not from the focused row', async () => {
    /* Guards the anchor fix. _focusedRowKey is volatile — every focus move
       updates it, and the old code used it as the range anchor AFTER already
       setting it to the current row, so the range was always row..row and
       shift selection silently degraded to single. The anchor now only moves
       on a non-shift selection. */
    const el = await mount('selection-mode="multiple"');
    const rows = () => Array.from(shadow(el).querySelectorAll<HTMLElement>('tbody tr[data-row-key]'));

    rows()[0].focus();
    key(rows()[0], ' ');            // anchor = row 0
    await el.updateComplete;
    key(rows()[0], 'ArrowDown');    // focus row 1 (anchor must NOT follow)
    key(rows()[1], 'ArrowDown');    // focus row 2
    key(rows()[2], ' ', { shiftKey: true });
    await el.updateComplete;

    const selected = rows().filter((r) => r.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(3);
  });

  it('Alt-chorded keys are never intercepted (browser history stays usable)', async () => {
    const el = await mount('selection-mode="single"');
    const row = shadow(el).querySelector<HTMLElement>('tbody tr[data-row-key]')!;
    row.focus();
    const ev = key(row, 'ArrowDown', { altKey: true });
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('mp-datatable focus continuity across data swaps', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const focusedRowKey = (el: MpDatatable) => {
    const active = document.activeElement as HTMLElement | null;
    return active?.dataset?.['rowKey'] ?? null;
  };

  it('replacing the dataset keeps focus on the row at the same index, never <body>', async () => {
    const el = await mount('selection-mode="single"');
    const rows = shadow(el).querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-key]');
    rows[1].focus();
    expect(focusedRowKey(el)).toBe('2');

    (el as unknown as { data: unknown }).data = [
      { id: 10, name: 'New-A' },
      { id: 11, name: 'New-B' },
      { id: 12, name: 'New-C' },
    ];
    await el.updateComplete;

    // Light DOM: focus lands on the row itself. Under a shadow root this read
    // as the host, because focus is retargeted at the boundary; the invariant
    // being asserted is the same one — focus stayed inside, never hit <body>.
    expect(el.contains(document.activeElement)).toBe(true);
    expect(focusedRowKey(el)).toBe('11');
  });

  it('when the new dataset is shorter than the index, the last row gets focus', async () => {
    const el = await mount('selection-mode="single"');
    shadow(el).querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-key]')[2].focus();

    (el as unknown as { data: unknown }).data = [{ id: 10, name: 'Only' }];
    await el.updateComplete;

    // Light DOM: focus lands on the row itself. Under a shadow root this read
    // as the host, because focus is retargeted at the boundary; the invariant
    // being asserted is the same one — focus stayed inside, never hit <body>.
    expect(el.contains(document.activeElement)).toBe(true);
    expect(focusedRowKey(el)).toBe('10');
  });

  it('a data swap while focus is elsewhere does NOT steal focus (scoped capture)', async () => {
    const el = await mount('selection-mode="single"');
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    (el as unknown as { data: unknown }).data = [{ id: 10, name: 'New' }];
    await el.updateComplete;

    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

describe('mp-datatable — keys from interactive descendants do not run row semantics', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('Space bubbling from the selection checkbox does not wipe a multi selection', async () => {
    const el = await mount('selection-mode="multiple"');
    (el as unknown as { selectedIds: unknown }).selectedIds = ['1', '2'];
    await el.updateComplete;

    const checkbox = shadow(el).querySelector('tbody tr[data-row-key="3"] mp-checkbox')!;
    key(checkbox as HTMLElement, ' ');
    await el.updateComplete;

    // The row handler must NOT have replaced the selection with row 3 only.
    const selected = Array.from(
      shadow(el).querySelectorAll('tbody tr[data-selected="true"]'),
    ).map((r) => (r as HTMLElement).dataset['rowKey']);
    expect(selected).toEqual(['1', '2']);
  });

  it('Space on the row itself still selects', async () => {
    const el = await mount('selection-mode="multiple"');
    const rowEl = shadow(el).querySelector<HTMLTableRowElement>('tbody tr[data-row-key="1"]')!;
    rowEl.focus();
    key(rowEl, ' ');
    await el.updateComplete;
    expect(rowEl.dataset['selected']).toBe('true');
  });
});

describe('mp-datatable — keys from interactive descendants do not run row semantics', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('Space bubbling from the selection checkbox does not wipe a multi selection', async () => {
    const el = await mount('selection-mode="multiple"');
    (el as unknown as { selectedIds: unknown }).selectedIds = ['1', '2'];
    await el.updateComplete;

    const checkbox = shadow(el).querySelector('tbody tr[data-row-key="3"] mp-checkbox')!;
    key(checkbox as HTMLElement, ' ');
    await el.updateComplete;

    // The row handler must NOT have replaced the selection with row 3 only.
    const selected = Array.from(
      shadow(el).querySelectorAll('tbody tr[data-selected="true"]'),
    ).map((r) => (r as HTMLElement).dataset['rowKey']);
    expect(selected).toEqual(['1', '2']);
  });

  it('Space on the row itself still selects', async () => {
    const el = await mount('selection-mode="multiple"');
    const rowEl = shadow(el).querySelector<HTMLTableRowElement>('tbody tr[data-row-key="1"]')!;
    rowEl.focus();
    key(rowEl, ' ');
    await el.updateComplete;
    expect(rowEl.dataset['selected']).toBe('true');
  });
});

describe('mp-datatable — role follows interactivity (decision D2)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('a non-interactive flat table claims NO role — plain table semantics', async () => {
    const el = await mount();
    expect(shadow(el).querySelector('table')!.hasAttribute('role')).toBe(false);
  });

  it('selectable rows make it a grid', async () => {
    const el = await mount('selection-mode="single"');
    expect(shadow(el).querySelector('table')!.getAttribute('role')).toBe('grid');
  });

  it('tree mode makes it a treegrid', async () => {
    const el = await mount('tree selection-mode="multiple"');
    expect(shadow(el).querySelector('table')!.getAttribute('role')).toBe('treegrid');
  });

  it('exposes aria-colcount and aria-busy while loading', async () => {
    const el = await mount();
    expect(shadow(el).querySelector('table')!.getAttribute('aria-colcount')).toBe('1');
    (el as unknown as { loading: boolean }).loading = true;
    await el.updateComplete;
    expect(shadow(el).querySelector('table')!.getAttribute('aria-busy')).toBe('true');
  });

  it('announces the loaded row count on the loading→loaded transition', async () => {
    const el = await mount();
    (el as unknown as { loading: boolean }).loading = true;
    await el.updateComplete;
    (el as unknown as { loading: boolean }).loading = false;
    await el.updateComplete;
    const live = shadow(el).querySelector('[aria-live], [role="status"]');
    expect(live?.textContent).toContain('Loaded 3 rows');
  });
});
