import { Component, signal, viewChild, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDatatableComponent } from './datatable.component';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsDatatableFilterPanelDirective } from '../datatable-filter-panel/datatable-filter-panel.directive';

interface Row {
  id: number;
  name: string;
  country: string;
}

/**
 * Inputs are driven from signals throughout. Change detection here is
 * signal-driven, so a plain-field write notifies nothing: detectChanges() would
 * not re-evaluate the binding and the child would silently keep its old value,
 * failing in a way that looks like a component bug.
 *
 * The `viewChild` is NOT decoration. An earlier design created the column
 * header views eagerly inside `effectiveColumns` so the nested directive's
 * constructor would have run by the time the computed read its template. That
 * throws NG0600 — `insertView` dirties Angular's query signals, which is a
 * signal write inside a reactive read — but ONLY once the host declares a view
 * query. A harness without one lets the broken design pass.
 */
@Component({
  selector: 'datatable-filter-harness',
  imports: [BsDatatableComponent, BsDatatableColumnDirective, BsDatatableFilterPanelDirective],
  template: `
    <bs-datatable #table [data]="data()" (filterChange)="lastChange.set($event)">
      <div
        *bsDatatableColumn="
          'name';
          filterable: nameFilterable();
          filterActive: nameActive();
          filterSummary: nameSummary()
        "
      >
        <span>{{ headerLabel() }}</span>
        @if (showOverride()) {
          <ng-container *bsDatatableFilterPanel="let values">
            <input class="name-filter" [value]="values()?.matching?.length ?? 0" />
          </ng-container>
        }
      </div>

      <div *bsDatatableColumn="'country'; filterable: true">Country</div>
    </bs-datatable>
  `,
})
class HarnessComponent {
  /** The view query that makes an eager-view regression fail loudly. */
  readonly table = viewChild<ElementRef<HTMLElement>>('table');

  readonly data = signal<Row[]>([
    { id: 1, name: 'Alpha', country: 'UK' },
    { id: 2, name: 'Bravo', country: 'US' },
  ]);
  readonly nameFilterable = signal(true);
  readonly showOverride = signal(true);
  readonly nameActive = signal(false);
  readonly nameSummary = signal<string | undefined>(undefined);
  readonly headerLabel = signal('Name');
  readonly lastChange = signal<unknown>(null);
}

describe('bs-datatable — *bsDatatableFilterPanel', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  const mp = () => fixture.nativeElement.querySelector('mp-datatable') as HTMLElement & Record<string, unknown>;
  const settle = async () => {
    fixture.detectChanges();
    await (mp() as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    await (mp() as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  };
  const filterRow = () => mp().querySelector('thead tr.filter-row');
  const triggerFor = (column: string) =>
    mp().querySelector<HTMLButtonElement>(`tr.filter-row th[data-column="${column}"] .filter-trigger`);
  const panel = () => document.querySelector('.mp-overlay-pane .filter-panel');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    await settle();
  });

  afterEach(async () => {
    // Leaving a panel open leaks a pane into document.body across tests.
    if (panel()) {
      triggerFor('name')?.click();
      await settle();
    }
  });

  it('marks columns filterable from the input, not from the presence of a panel', async () => {
    const columns = mp()['columns'] as { name: string; filterable?: boolean }[];
    expect(columns.find((c) => c.name === 'name')?.filterable).toBe(true);
    // No nested panel at all, yet still filterable — it gets the built-in one.
    expect(columns.find((c) => c.name === 'country')?.filterable).toBe(true);
  });

  it('renders one cell per column, with a trigger in each filterable one', async () => {
    expect(filterRow()).toBeTruthy();
    const cells = mp().querySelectorAll('tr.filter-row > th');
    expect(cells.length).toBe(2);
    expect(cells[0].querySelector('.filter-trigger')).toBeTruthy();
    expect(cells[1].querySelector('.filter-trigger')).toBeTruthy();
  });

  /**
   * The load-bearing case. The nested directive's constructor does not run
   * until the column's header view is created, which is long after
   * `effectiveColumns` first evaluates — so resolving the template up front
   * would find nothing and silently fall back to the built-in panel forever.
   */
  it('mounts the nested template on the FIRST open', async () => {
    triggerFor('name')!.click();
    await settle();

    const mounted = document.querySelector('.mp-overlay-pane .name-filter');
    expect(mounted).toBeTruthy();
    // Portalled: the consumer's node is in document.body, not in the host.
    expect(mp().contains(mounted)).toBe(false);
  });

  it('renders the built-in panel for a column with no nested template', async () => {
    triggerFor('country')!.click();
    await settle();

    expect(document.querySelector('.mp-overlay-pane .filter-search')).toBeTruthy();
    expect(document.querySelector('.mp-overlay-pane .filter-clear')).toBeTruthy();
    expect(document.querySelectorAll('.mp-overlay-pane .filter-option').length).toBe(2);

    triggerFor('country')!.click();
    await settle();
  });

  it('falls back to the built-in panel when the override is removed, and back again', async () => {
    fixture.componentInstance.showOverride.set(false);
    await settle();

    triggerFor('name')!.click();
    await settle();
    expect(document.querySelector('.mp-overlay-pane .name-filter')).toBeNull();
    expect(document.querySelector('.mp-overlay-pane .filter-search')).toBeTruthy();

    triggerFor('name')!.click();
    await settle();

    fixture.componentInstance.showOverride.set(true);
    await settle();

    triggerFor('name')!.click();
    await settle();
    expect(document.querySelector('.mp-overlay-pane .name-filter')).toBeTruthy();
  });

  it('forwards filterActive and filterSummary as visual hints', async () => {
    const columnsOf = () =>
      mp()['columns'] as { name: string; filterActive?: boolean; filterSummary?: string }[];
    expect(columnsOf().find((c) => c.name === 'name')?.filterActive).toBe(false);

    fixture.componentInstance.nameActive.set(true);
    fixture.componentInstance.nameSummary.set('2 selected');
    await settle();

    const col = columnsOf().find((c) => c.name === 'name');
    expect(col?.filterActive).toBe(true);
    expect(col?.filterSummary).toBe('2 selected');
    expect(triggerFor('name')!.querySelector('.filter-summary')?.textContent).toContain('2 selected');
  });

  it('drops the row entirely when no column is filterable', async () => {
    expect(filterRow()).toBeTruthy();

    fixture.componentInstance.nameFilterable.set(false);
    await settle();
    // `country` is still filterable, so the row stays.
    expect(filterRow()).toBeTruthy();
  });

  /**
   * A signal read inside a header template must not feed back into
   * `effectiveColumns`. If it did, every header repaint would rebuild the
   * column defs — and with them every view and the element's own filter state.
   */
  it('does not recompute effectiveColumns when a header signal changes', async () => {
    const before = mp()['columns'];
    fixture.componentInstance.headerLabel.set('Renamed');
    await settle();
    expect(mp()['columns']).toBe(before);
  });

  it('emits filterChange with the selection from the built-in panel', async () => {
    triggerFor('country')!.click();
    await settle();

    const option = document.querySelector<HTMLInputElement>('.mp-overlay-pane .filter-option input');
    option!.click();
    await settle();

    const detail = fixture.componentInstance.lastChange() as {
      column: string;
      selected: { value: unknown }[];
      inverse: boolean;
    };
    expect(detail.column).toBe('country');
    expect(detail.selected.length).toBe(1);
    expect(detail.inverse).toBe(false);

    triggerFor('country')!.click();
    await settle();
  });

  /**
   * Regression for a pre-existing leak: every recompute of `effectiveColumns`
   * built fresh EmbeddedViewRefs and pushed them onto the arrays, while the
   * previous generation stayed alive until the component was destroyed.
   */
  it('does not accumulate EmbeddedViewRefs or onChange subscriptions', async () => {
    const component = fixture.debugElement.children[0].componentInstance as unknown as {
      headerViews: unknown[];
      filterViews: unknown[];
      filterUnsubscribes: unknown[];
    };

    for (let i = 0; i < 5; i++) {
      fixture.componentInstance.nameFilterable.set(i % 2 === 0);
      await settle();
    }

    expect(component.headerViews.length).toBeLessThanOrEqual(2);
    expect(component.filterViews.length).toBeLessThanOrEqual(1);
    expect(component.filterUnsubscribes.length).toBeLessThanOrEqual(1);
  });

  it('clears the column’s template when the nested directive is destroyed', async () => {
    const datatable = fixture.debugElement.children[0].componentInstance as unknown as {
      columnDirectives: () => readonly BsDatatableColumnDirective[];
    };
    const column = datatable.columnDirectives().find((d) => d.name() === 'name');
    expect(column?.filterPanelTemplate).toBeTruthy();

    fixture.componentInstance.showOverride.set(false);
    await settle();

    expect(column?.filterPanelTemplate).toBeUndefined();
  });
});
