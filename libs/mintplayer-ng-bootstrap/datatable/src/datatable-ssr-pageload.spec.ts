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
 * The same consumer must work with no server render at all, and with a server
 * render that has no `stateKey` (no prefetch): there the browser fetches page 1
 * itself and `(pageload)` reports it with `seeded: false`.
 *
 * `renderApplication` needs the server platform and hydration the browser one,
 * so each step tears the previous platform down (vitest isolates files).
 */
const EXTRA = { columns: ['name', 'year'], disabledActions: ['delete'] };
const ROWS = [{ id: 1, name: 'A Sky Full of Stars', year: 2014 }];
const SHELL = '<html><head></head><body><bs-query-grid></bs-query-grid></body></html>';

type Phase = 'server' | 'client';
let calls: Record<Phase, number>;
let loads: { phase: Phase; detail: DatatablePageLoadDetail }[];
let phase: Phase;
let stateKey: string | null;

@Component({
  selector: 'bs-query-grid',
  imports: [BsDatatableComponent],
  template: `<bs-datatable [stateKey]="stateKey" [perPage]="10" [columns]="columns()" [fetch]="fetch" (pageload)="onPageLoad($event)" />`,
})
class QueryGridComponent {
  readonly stateKey = stateKey;
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

async function renderOnServer(): Promise<string> {
  phase = 'server';
  const html = await renderApplication(
    // provideClientHydration on the server too: without it the server writes no hydration info
    // and the browser re-renders from scratch (NG0505), which is not the path a real app takes.
    (context) => bootstrapApplication(QueryGridComponent, { providers: [provideServerRendering(), provideClientHydration()] }, context),
    { document: SHELL, url: '/' },
  );
  destroyPlatform();
  return html;
}

/** Boots the browser app on `html`: hydrating it when it is server output, rendering from scratch when it is the bare shell. */
async function bootInBrowser(html: string, hydrate: boolean, beforeBoot: () => void = () => undefined) {
  phase = 'client';
  document.open();
  document.write(html);
  document.close();
  beforeBoot();
  const app = await bootstrapApplication(QueryGridComponent, { providers: hydrate ? [provideClientHydration()] : [] });
  const appRef = app.injector.get(ApplicationRef);
  await appRef.whenStable();
  await settle();
  await appRef.whenStable();
  return app;
}

const clientLoads = () => loads.filter((l) => l.phase === 'client').map((l) => l.detail);
const cells = () => [...document.querySelectorAll('bs-datatable tbody td')].map((td) => td.textContent?.trim());
const headers = () => document.querySelectorAll('bs-datatable thead th').length;
const request = { parentId: null, page: 1, perPage: 10, sortColumns: [], filters: {}, params: undefined };
const result = { data: ROWS, totalRecords: 1, extra: EXTRA };

describe('bs-datatable with and without a server render (#450)', () => {
  beforeAll(() => destroyPlatform());
  beforeEach(() => {
    calls = { server: 0, client: 0 };
    loads = [];
  });
  afterEach(() => destroyPlatform());

  it('server render with stateKey: pageload fires once in the browser, seeded, extra intact, no browser fetch', async () => {
    stateKey = 'songs';
    const html = await renderOnServer();
    expect(calls.server).toBe(1);
    expect(html).toContain('A Sky Full of Stars');

    let serverCell: Element | null = null;
    const app = await bootInBrowser(html, true, () => (serverCell = document.querySelector('bs-datatable tbody td')));
    // Hydrated, not re-rendered: the server's cell is the one on the page.
    expect(serverCell).not.toBeNull();
    expect(document.querySelector('bs-datatable tbody td')).toBe(serverCell);
    expect(calls.client).toBe(0);
    expect(loads.filter((l) => l.phase === 'server')).toEqual([]);
    expect(clientLoads()).toEqual([{ request, result, seeded: true }]);
    expect(cells()).toContain('A Sky Full of Stars');
    expect(headers()).toBeGreaterThan(0);
    app.destroy();
  });

  it('server render without stateKey: no prefetch, the browser fetches page 1 and pageload reports it unseeded', async () => {
    stateKey = null;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const html = await renderOnServer();
    warn.mockRestore();
    expect(calls.server).toBe(0);
    expect(html).not.toContain('A Sky Full of Stars');

    const app = await bootInBrowser(html, true);
    expect(calls.client).toBe(1);
    expect(clientLoads()).toEqual([{ request, result, seeded: false }]);
    expect(cells()).toContain('A Sky Full of Stars');
    expect(headers()).toBeGreaterThan(0);
    app.destroy();
  });

  it('no server render: the browser fetches page 1 once, pageload reports it unseeded, and the grid renders', async () => {
    stateKey = 'songs';
    const app = await bootInBrowser(SHELL, false);
    expect(calls).toEqual({ server: 0, client: 1 });
    expect(clientLoads()).toEqual([{ request, result, seeded: false }]);
    expect(cells()).toContain('A Sky Full of Stars');
    expect(headers()).toBeGreaterThan(0);
    app.destroy();
  });
});
