import { ApplicationRef, Component, destroyPlatform, signal } from '@angular/core';
import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import type { DatatableColumnDef, DatatableFetch, DatatablePageLoadDetail } from '@mintplayer/ui-core/datatable';
import { BsDatatableComponent } from './generated/datatable.component.generated';

/**
 * #450: a consumer whose columns come from its query result (MintPlayer.Spark's
 * query grid) records them off the response. On the server its `fetch` runs;
 * on the client the transferred seed replaces that call, so the only copy of
 * the result is `(pageload)` with `seeded: true` and the response's `extra`.
 * Before #450 the seed kept rows and total only, and the hydrated grid kept
 * its rows with no cells and no header.
 *
 * `renderApplication` needs the server platform and hydration the browser one,
 * so this file tears each down before the next (vitest isolates files).
 */
const EXTRA = { columns: ['name', 'year'], disabledActions: ['delete'] };
const ROWS = [{ id: 1, name: 'A Sky Full of Stars', year: 2014 }];

const calls = { server: 0, client: 0 };
const loads: { phase: 'server' | 'client'; detail: DatatablePageLoadDetail }[] = [];
let phase: 'server' | 'client' = 'server';

@Component({
  selector: 'bs-query-grid',
  imports: [BsDatatableComponent],
  template: `<bs-datatable stateKey="songs" [perPage]="10" [columns]="columns()" [fetch]="fetch" (pageload)="onPageLoad($event)" />`,
})
class QueryGridComponent {
  readonly columns = signal<DatatableColumnDef[]>([]);
  readonly fetch: DatatableFetch = async () => {
    calls[phase]++;
    this.record(EXTRA.columns);
    return { data: ROWS, totalRecords: ROWS.length, extra: EXTRA };
  };

  onPageLoad(detail: DatatablePageLoadDetail) {
    loads.push({ phase, detail });
    if (detail.seeded) this.record((detail.result.extra as typeof EXTRA).columns);
  }

  private record(names: string[]) {
    this.columns.set(names.map((name) => ({ name, label: name })));
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('bs-datatable seeded page 1 hands the consumer its fetch result (#450)', () => {
  beforeAll(() => destroyPlatform());
  afterAll(() => destroyPlatform());

  it('fires pageload once on the client, seeded, with extra intact, and never fetches page 1 there', async () => {
    const html = await renderApplication(
      (context) => bootstrapApplication(QueryGridComponent, { providers: [provideServerRendering()] }, context),
      { document: '<html><head></head><body><bs-query-grid></bs-query-grid></body></html>', url: '/' },
    );
    expect(calls.server).toBe(1);
    expect(html).toContain('A Sky Full of Stars');
    destroyPlatform();

    phase = 'client';
    document.open();
    document.write(html);
    document.close();
    const app = await bootstrapApplication(QueryGridComponent, { providers: [provideClientHydration()] });
    await app.injector.get(ApplicationRef).whenStable();
    await settle();
    await app.injector.get(ApplicationRef).whenStable();

    expect(calls.client).toBe(0);
    expect(loads.filter((l) => l.phase === 'server')).toEqual([]);
    expect(loads.filter((l) => l.phase === 'client').map((l) => l.detail)).toEqual([
      {
        request: { parentId: null, page: 1, perPage: 10, sortColumns: [], filters: {}, params: undefined },
        result: { data: ROWS, totalRecords: 1, extra: EXTRA },
        seeded: true,
      },
    ]);
    const cells = [...document.querySelectorAll('bs-datatable tbody td')].map((td) => td.textContent?.trim());
    expect(cells).toContain('A Sky Full of Stars');
    expect(document.querySelectorAll('bs-datatable thead th').length).toBeGreaterThan(0);
    app.destroy();
  });
});
