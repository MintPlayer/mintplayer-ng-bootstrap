import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DatatableColumnDef, DatatableSelectionMode, MpDatatable } from '@mintplayer/web-components/datatable';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsRowTemplateDirective } from '../row-template/row-template.directive';
import { DatatableSettings } from '../datatable-settings';

import { BsDatatableComponent } from './datatable.component';

interface Row { id: number; name: string; }

@Component({
  selector: 'datatable-create-harness',
  imports: [BsDatatableComponent],
  template: `<bs-datatable [columns]="columns()" [data]="data()"></bs-datatable>`,
})
class HarnessComponent {
  readonly data = signal<Row[]>([
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Bravo' },
  ]);
  readonly columns = signal<DatatableColumnDef<Row>[]>([
    { name: 'name', label: 'Name', cellRenderer: (r) => r.name },
  ]);
}

describe('BsDatatableComponent', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HarnessComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  it('should render the inner <mp-datatable>', () => {
    expect(fixture.nativeElement.querySelector('bs-datatable')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('mp-datatable')).toBeTruthy();
  });
});

@Component({
  selector: 'datatable-wrapper-harness',
  imports: [BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective],
  template: `
    <bs-datatable [data]="data()" [(settings)]="settings" [(selection)]="selection" [(expandedIds)]="expanded"
      [selectionMode]="'multiple'" [tree]="true" [idKey]="'id'" [childCountKey]="'kids'"
      (rowClick)="log('click', $event)" (rowDblClick)="log('dblclick', $event)" (rowContextMenu)="log('contextmenu', $event)"
      (rowExpand)="log('expand', $event)" (rowCollapse)="log('collapse', $event)" (filterChange)="log('filter', $event)">
      <ng-template bsDatatableColumn="name">Name</ng-template>
      <ng-template bsDatatableColumn="empty"></ng-template>
      <ng-template bsDatatableColumn="two"><b>A</b><i>B</i></ng-template>
      @if (rowTpl() === 'plain') {
        <ng-template bsRowTemplate let-row let-i="index" let-p="isPlaceholder"><td class="cell">{{ p ? 'loading' : row.name }}#{{ i }}</td></ng-template>
      } @else if (rowTpl() === 'upper') {
        <ng-template bsRowTemplate let-row><td class="cell">{{ row?.name?.toUpperCase() }}</td></ng-template>
      }
    </bs-datatable>`,
})
class WrapperHarness {
  readonly data = signal<Row[]>([{ id: 1, name: 'Alpha' }, { id: 2, name: 'Bravo' }]);
  readonly settings = signal(new DatatableSettings({ page: { values: [1, 2, 3], selected: 2 } }));
  readonly selection = signal<Row[]>([]);
  readonly expanded = signal<Set<unknown>>(new Set());
  readonly rowTpl = signal<'plain' | 'upper' | 'none'>('plain');
  readonly events: [string, unknown][] = [];
  log(name: string, e: unknown) { this.events.push([name, e]); }
}

describe('BsDatatableComponent wrapper bridges', () => {
  let fixture: ComponentFixture<WrapperHarness>;
  const wc = () => fixture.nativeElement.querySelector('mp-datatable') as MpDatatable;
  const fire = (type: string, detail: unknown) => {
    wc().dispatchEvent(new CustomEvent(type, { detail }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(WrapperHarness);
    fixture.detectChanges();
  });

  it('a sort change stores the sort and returns to page 1', () => {
    fire('mp-datatable-sort-change', { sortColumns: [{ property: 'name', direction: 'descending' }] });
    const s = fixture.componentInstance.settings();
    expect(s.sortColumns).toEqual([{ property: 'name', direction: 'descending' }]);
    expect(s.page.selected).toBe(1);
    expect(wc().sortColumns).toEqual([{ property: 'name', direction: 'descending' }]);
  });

  it('a page change stores the page; a per-page change stores it and returns to page 1', () => {
    fire('mp-datatable-page-change', { page: 3 });
    expect(fixture.componentInstance.settings().page.selected).toBe(3);
    expect(wc().page).toBe(3);
    fire('mp-datatable-per-page-change', { perPage: 50 });
    expect(fixture.componentInstance.settings().perPage.selected).toBe(50);
    expect(fixture.componentInstance.settings().page.selected).toBe(1);
  });

  it('a selection change merges by key: the event row, else the model row, else omitted; a host selection pushes down', () => {
    const rows = fixture.componentInstance.data();
    fire('mp-datatable-selection-change', { selectedIds: ['2'], selectedRows: [rows[1]] });
    expect(fixture.componentInstance.selection()).toEqual([rows[1]]);

    // '2' has no row in the event (off-page): the model's row for that key is
    // kept, by reference. '77' has no row anywhere: it is left out of the model.
    fire('mp-datatable-selection-change', { selectedIds: ['2', '1', '77'], selectedRows: [undefined, rows[0], undefined] });
    const merged = fixture.componentInstance.selection();
    expect(merged).toHaveLength(2);
    expect(merged[0]).toBe(rows[1]);
    expect(merged[1]).toBe(rows[0]);

    fixture.componentInstance.selection.set([rows[0]]);
    fixture.detectChanges();
    expect([...wc().selectedIds]).toEqual(['1']);
    expect(wc().selectedRows).toEqual([rows[0]]);
  });

  it.each([
    ['mp-datatable-row-click', 'click'],
    ['mp-datatable-row-dblclick', 'dblclick'],
    ['mp-datatable-row-contextmenu', 'contextmenu'],
  ])('%s is re-emitted as a row event', (type, name) => {
    const originalEvent = new MouseEvent('click');
    const row = fixture.componentInstance.data()[0];
    fire(type, { row, rowIndex: 0, rowKey: '1', originalEvent, extra: 'dropped' });
    expect(fixture.componentInstance.events).toEqual([[name, { row, rowIndex: 0, rowKey: '1', originalEvent }]]);
  });

  it('re-emits tree expand/collapse and filter changes', () => {
    const row = fixture.componentInstance.data()[0];
    fire('mp-datatable-row-expand', { row, depth: 0, parentId: null, extra: 1 });
    fire('mp-datatable-row-collapse', { row, depth: 1, parentId: 7 });
    const filter = { column: 'name', selected: ['Alpha'] };
    fire('mp-datatable-filter-change', filter);
    expect(fixture.componentInstance.events).toEqual([
      ['expand', { row, depth: 0, parentId: null }],
      ['collapse', { row, depth: 1, parentId: 7 }],
      ['filter', filter],
    ]);
  });

  it('syncs [(expandedIds)] both ways, ignoring an echo of the same set', () => {
    fire('mp-datatable-expanded-ids-change', { expandedIds: [1] });
    const first = fixture.componentInstance.expanded();
    expect([...first]).toEqual([1]);
    fire('mp-datatable-expanded-ids-change', { expandedIds: [1] });
    expect(fixture.componentInstance.expanded()).toBe(first);
    fixture.componentInstance.expanded.set(new Set([2]));
    fixture.detectChanges();
    expect([...wc().expandedIds]).toEqual([2]);
  });

  it('builds column headers from the column templates: text, nothing, or a fragment', () => {
    const [name, empty, two] = wc().columns;
    expect((name.headerRenderer!(name) as Node).textContent).toBe('Name');
    expect(empty.headerRenderer!(empty)).toBe('');
    const frag = two.headerRenderer!(two) as DocumentFragment;
    expect(frag).toBeInstanceOf(DocumentFragment);
    expect(frag.textContent).toBe('AB');
  });

  it('renders a row through the row template, reusing the view per row key', () => {
    const render = wc().rowRenderer!;
    const row = fixture.componentInstance.data()[0];
    const [cell] = render(row, 0, undefined) as Node[];
    expect(cell.textContent).toBe('Alpha#0');
    const [again] = render({ ...row, name: 'Alpha 2' }, 4, undefined) as Node[];
    expect(again).toBe(cell);
    expect(again.textContent).toBe('Alpha 2#4');
  });

  it('renders a tree placeholder slot under a synthetic key', () => {
    const [cell] = wc().rowRenderer!(undefined, 3, { isPlaceholder: true, depth: 1, isExpanded: false } as never) as Node[];
    expect(cell.textContent).toBe('loading#3');
  });

  it('swapping the row template renders the new one, not a cached view of the old', () => {
    const row = fixture.componentInstance.data()[0];
    wc().rowRenderer!(row, 0, undefined);
    fixture.componentInstance.rowTpl.set('upper');
    fixture.detectChanges();
    const [cell] = wc().rowRenderer!(row, 0, undefined) as Node[];
    expect(cell.textContent).toBe('ALPHA');
  });

  it('removing the row template clears the renderer', () => {
    fixture.componentInstance.rowTpl.set('none');
    fixture.detectChanges();
    expect(wc().rowRenderer).toBeUndefined();
  });
});

@Component({
  selector: 'datatable-selection-harness',
  imports: [BsDatatableComponent],
  template: `<bs-datatable [columns]="columns()" [data]="data()" [selectionMode]="mode()" [rowLabel]="rowLabel()"
    [selection]="selection()" (selectionChange)="onSelection($event)"></bs-datatable>`,
})
class SelectionHarness {
  readonly data = signal<Row[]>([
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Bravo' },
    { id: 3, name: 'Charlie' },
  ]);
  readonly columns = signal<DatatableColumnDef<Row>[]>([
    { name: 'name', label: 'Name', cellRenderer: (r) => r.name },
  ]);
  readonly mode = signal<DatatableSelectionMode>('multiple');
  readonly rowLabel = signal<((row: Row) => string) | null>(null);
  readonly selection = signal<Row[]>([]);
  /** Every value the wrapper's `selection` model emitted (the two-way write-back). */
  readonly emissions: Row[][] = [];
  onSelection(rows: Row[]) {
    this.emissions.push(rows);
    this.selection.set(rows);
  }
}

/**
 * Spike S2: the WC event → `selection.set` → selection effect → `selectedRows`
 * setter round-trip. Three counters prove there is no echo and no loop:
 * `mp-datatable-selection-change` events the element dispatched, values the
 * wrapper's model emitted, and calls to the element's `selectedRows` setter.
 */
describe('BsDatatableComponent selection model (S2 echo guard)', () => {
  let fixture: ComponentFixture<SelectionHarness>;
  let host: SelectionHarness;
  let el: MpDatatable;
  let events: number;
  let pushes: { mock: { calls: unknown[][] } };

  const settle = async () => {
    fixture.detectChanges();
    await el.updateComplete;
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    await el.updateComplete;
  };
  const rowEl = (key: string) => el.querySelector<HTMLTableRowElement>(`tbody tr[data-row-key="${key}"]`)!;
  const clickRow = async (key: string, init: MouseEventInit = {}) => {
    rowEl(key).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
    await settle();
  };
  const headerClear = async () => {
    el.querySelector('thead th.checkbox-cell mp-checkbox')!.dispatchEvent(new CustomEvent('change'));
    await settle();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(SelectionHarness);
    host = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement.querySelector('mp-datatable') as MpDatatable;
    await settle();
    events = 0;
    el.addEventListener('mp-datatable-selection-change', () => events++);
    pushes = vi.spyOn(el, 'selectedRows', 'set');
  });

  it('a row click lands in the model once and is not pushed back', async () => {
    await clickRow('2');
    expect(host.selection()).toHaveLength(1);
    expect(host.selection()[0]).toBe(host.data()[1]);
    expect(events).toBe(1);
    expect(host.emissions).toHaveLength(1);
    expect(pushes.mock.calls).toHaveLength(0);
  });

  it('(a) a key without a row stays in the element and out of the model, and is never pushed back', async () => {
    // A key the element holds but has never had a row for (seeded as a key).
    el.selectedIds = ['99'];
    await settle();
    await clickRow('1', { ctrlKey: true });
    expect(host.selection()).toEqual([host.data()[0]]);
    expect(el.selectedIds).toEqual(['99', '1']);
    // An unrelated input change re-runs change detection: still no push, so '99' survives.
    host.rowLabel.set((r) => r.name);
    await settle();
    expect(el.selectedIds).toEqual(['99', '1']);
    expect(events).toBe(1);
    expect(host.emissions).toHaveLength(1);
    expect(pushes.mock.calls).toHaveLength(0);
  });

  it('(b) a new host array with the same keys is not pushed', async () => {
    await clickRow('1');
    host.selection.set([{ ...host.data()[0] }]);
    await settle();
    expect(pushes.mock.calls).toHaveLength(0);
    expect(el.selectedIds).toEqual(['1']);
    expect(events).toBe(1);
    expect(host.emissions).toHaveLength(1);
  });

  it('(c) a host array with a new key is pushed once, and the element reports that row back later', async () => {
    await clickRow('1');
    const offPage: Row = { id: 50, name: 'Not loaded' };
    host.selection.set([host.data()[0], offPage]);
    await settle();
    expect(pushes.mock.calls).toHaveLength(1);
    expect(el.selectedIds).toEqual(['1', '50']);

    await clickRow('2', { ctrlKey: true });
    const model = host.selection();
    expect(model).toHaveLength(3);
    expect(model[0]).toBe(host.data()[0]);
    expect(model[1]).toBe(offPage);
    expect(model[2]).toBe(host.data()[1]);
    expect(pushes.mock.calls).toHaveLength(1);
    expect(events).toBe(2);
    expect(host.emissions).toHaveLength(2);
  });

  it('(d) a header clear, including a row-less key, ends as [] with one event and no push', async () => {
    el.selectedIds = ['99'];
    await settle();
    await clickRow('1', { ctrlKey: true });
    await headerClear();
    expect(host.selection()).toEqual([]);
    expect(el.selectedIds).toEqual([]);
    expect(events).toBe(2);
    expect(host.emissions).toHaveLength(2);
    expect(pushes.mock.calls).toHaveLength(0);
  });

  it('[rowLabel] reaches the element, and clearing it clears the element', async () => {
    host.rowLabel.set((r) => `row ${r.name}`);
    await settle();
    expect(el.rowLabel!(host.data()[0])).toBe('row Alpha');
    host.rowLabel.set(null);
    await settle();
    expect(el.rowLabel).toBeNull();
  });

  it("[selectionMode]=\"'checkbox'\" reaches the element: a row click selects nothing, a row checkbox does", async () => {
    host.mode.set('checkbox');
    await settle();
    expect(el.selectionMode).toBe('checkbox');
    await clickRow('2');
    expect(host.selection()).toEqual([]);
    expect(events).toBe(0);
    rowEl('2').querySelector('mp-checkbox')!.dispatchEvent(new CustomEvent('change'));
    await settle();
    expect(host.selection()).toHaveLength(1);
    expect(host.selection()[0]).toBe(host.data()[1]);
    expect(events).toBe(1);
    expect(pushes.mock.calls).toHaveLength(0);
  });
});

describe('DatatableSettings', () => {
  it('defaults to 20 of 10/20/50 per page, page 1, no sort', () => {
    const s = new DatatableSettings();
    expect(s.perPage).toEqual({ values: [10, 20, 50], selected: 20 });
    expect(s.page).toEqual({ values: [1], selected: 1 });
    expect(s.toPagination()).toEqual({ sortColumns: [], perPage: 20, page: 1 });
  });

  it('keeps the given paging', () => {
    const s = new DatatableSettings({ perPage: { values: [5], selected: 5 }, page: { values: [1, 2], selected: 2 } });
    expect(s.toPagination()).toEqual({ sortColumns: [], perPage: 5, page: 2 });
  });
});
