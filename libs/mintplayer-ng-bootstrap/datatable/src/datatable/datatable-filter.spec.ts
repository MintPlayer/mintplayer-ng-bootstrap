import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDatatableComponent } from './datatable.component';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';
import { BsDatatableFilterDirective } from '../datatable-filter/datatable-filter.directive';

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
 */
@Component({
  selector: 'datatable-filter-harness',
  imports: [BsDatatableComponent, BsDatatableColumnDirective, BsDatatableFilterDirective],
  template: `
    <bs-datatable [data]="data()">
      <div *bsDatatableColumn="'name'">Name</div>
      <div *bsDatatableColumn="'country'">Country</div>

      @if (showNameFilter()) {
        <div *bsDatatableFilter="'name'; active: nameActive()">
          <input class="name-filter" [value]="nameValue()" />
        </div>
      }
    </bs-datatable>
  `,
})
class HarnessComponent {
  readonly data = signal<Row[]>([
    { id: 1, name: 'Alpha', country: 'UK' },
    { id: 2, name: 'Bravo', country: 'US' },
  ]);
  readonly showNameFilter = signal(true);
  readonly nameActive = signal(false);
  readonly nameValue = signal('');
}

describe('bs-datatable — [bsDatatableFilter]', () => {
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
  const trigger = () => mp().querySelector<HTMLButtonElement>('tr.filter-row th[data-column="name"] .filter-trigger');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    await settle();
  });

  it('marks only the column that has a filter template', async () => {
    const columns = mp()['columns'] as { name: string; filterable?: boolean }[];
    expect(columns.find((c) => c.name === 'name')?.filterable).toBe(true);
    expect(columns.find((c) => c.name === 'country')?.filterable).toBeFalsy();
  });

  it('renders the filter row, with an empty cell for the unfiltered column', async () => {
    expect(filterRow()).toBeTruthy();
    const cells = mp().querySelectorAll('tr.filter-row > th');
    expect(cells.length).toBe(2);
    expect(cells[0].querySelector('.filter-trigger')).toBeTruthy();
    expect(cells[1].querySelector('.filter-trigger')).toBeFalsy();
  });

  it('mounts the template content into the panel when it opens', async () => {
    trigger()!.click();
    await settle();

    const mounted = document.querySelector('.mp-overlay-pane .name-filter');
    expect(mounted).toBeTruthy();
    // The panel is portalled: the consumer's node is in document.body, not
    // inside the host element.
    expect(mp().contains(mounted)).toBe(false);

    trigger()!.click();
    await settle();
  });

  it('forwards the active flag as a visual hint', async () => {
    const columnsOf = () => mp()['columns'] as { name: string; filterActive?: boolean }[];
    expect(columnsOf().find((c) => c.name === 'name')?.filterActive).toBe(false);

    fixture.componentInstance.nameActive.set(true);
    await settle();

    expect(columnsOf().find((c) => c.name === 'name')?.filterActive).toBe(true);
  });

  it('drops the row entirely when the last filter template is removed', async () => {
    expect(filterRow()).toBeTruthy();

    fixture.componentInstance.showNameFilter.set(false);
    await settle();

    // The row follows the templates: it is a consequence of them, not a flag.
    expect(filterRow()).toBeNull();
    const columns = mp()['columns'] as { filterable?: boolean }[];
    expect(columns.every((c) => !c.filterable)).toBe(true);
  });

  /**
   * Regression for a pre-existing leak: every recompute of `effectiveColumns`
   * built fresh EmbeddedViewRefs and pushed them onto the arrays, while the
   * previous generation stayed alive until the component was destroyed.
   * Filters doubled the rate. Toggling the template forces several recomputes.
   */
  it('does not accumulate EmbeddedViewRefs across recomputes', async () => {
    const component = fixture.debugElement.children[0].componentInstance as unknown as {
      headerViews: unknown[];
      filterViews: unknown[];
    };

    for (let i = 0; i < 5; i++) {
      fixture.componentInstance.showNameFilter.set(i % 2 === 0);
      await settle();
    }

    // One view per column directive, one per filter directive — never a
    // generation's worth more each time.
    expect(component.headerViews.length).toBeLessThanOrEqual(2);
    expect(component.filterViews.length).toBeLessThanOrEqual(1);
  });
});
