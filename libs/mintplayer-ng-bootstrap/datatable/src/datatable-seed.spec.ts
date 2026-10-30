import { Component, makeStateKey, signal, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { datatableCore, type DatatableColumnDef, type DatatableFetch, type DatatableInputs } from '@mintplayer/ui-core/datatable';
import { BsDatatableComponent } from './generated/datatable.component.generated';

/**
 * #449 review: a transferred seed answers page 1 once. Only the first `fetch`
 * to arrive after `adopt` keeps it; any later swap of `fetch` identity is a
 * new source and reloads, seeded or not (MintPlayer.Spark swaps to a live
 * fetch with the same query, and falls back to a new identity to reload).
 */
const COLUMNS: DatatableColumnDef[] = [{ name: 'name', label: 'Name' }];
const SEED_ROWS = [{ id: 1, name: 'Seeded' }];

const fetchFor = (name: string) =>
  vi.fn<DatatableFetch>(() => Promise.resolve({ data: [{ id: 2, name }], totalRecords: 1 }));

@Component({
  selector: 'bs-seed-host',
  imports: [BsDatatableComponent],
  template: `<bs-datatable [pagination]="true" stateKey="seed" [perPage]="10" [columns]="columns" [fetch]="fetch()" />`,
})
class HostComponent {
  readonly columns = COLUMNS;
  readonly fetch = signal<DatatableFetch | null>(null);
}

/** Puts the server's page 1 for this table's query into the transfer state, as the server render would. */
async function transferSeed(): Promise<void> {
  const inputs = {
    columns: COLUMNS,
    fetch: () => Promise.resolve({ data: SEED_ROWS, totalRecords: 1 }),
    stateKey: 'seed',
    sortColumns: [],
    page: 1,
    perPage: 10,
    filters: {},
    fetchParams: null,
    virtualScroll: false,
  } as unknown as DatatableInputs;
  const seed = await datatableCore.prefetch!(inputs, new AbortController().signal);
  TestBed.inject(TransferState).set(makeStateKey<unknown>(datatableCore.transferKey!(inputs)!), seed as never);
}

describe('bs-datatable transferred seed vs a new fetch identity (#449 review)', () => {
  const setup = async (initial: DatatableFetch | null) => {
    await transferSeed();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.fetch.set(initial);
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
    };
    const names = () => [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody td')].map((td) => td.textContent?.trim());
    await settle();
    return { fixture, settle, names };
  };

  it('hydrates from the seed without fetching, then reloads when fetch is swapped for the same query', async () => {
    const a = fetchFor('A');
    const { fixture, settle, names } = await setup(a);
    expect(names()).toEqual(['Seeded']);
    expect(a).not.toHaveBeenCalled();

    const b = fetchFor('B');
    fixture.componentInstance.fetch.set(b);
    await settle();
    expect(b).toHaveBeenCalledTimes(1);
    expect(b.mock.calls[0][0]).toMatchObject({ page: 1, perPage: 10 });
    expect(names()).toEqual(['B']);
  });

  it('adopts the seed for a late fetch once, then reloads when that fetch is swapped', async () => {
    const { fixture, settle, names } = await setup(null);

    const a = fetchFor('A');
    fixture.componentInstance.fetch.set(a);
    await settle();
    expect(names()).toEqual(['Seeded']);
    expect(a).not.toHaveBeenCalled();

    const b = fetchFor('B');
    fixture.componentInstance.fetch.set(b);
    await settle();
    expect(b).toHaveBeenCalledTimes(1);
    expect(names()).toEqual(['B']);
  });
});
