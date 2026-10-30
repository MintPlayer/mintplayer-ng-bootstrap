import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { createApp, createSSRApp, defineComponent, h, nextTick, type App } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createTransferStore, serializeTransferState } from '@mintplayer/ui-core/transfer-state';
import type { DatatableColumnDef, DatatableFetch, DatatablePageLoadDetail } from '@mintplayer/ui-core/datatable';
import { BsDatatable } from '@mintplayer/vue-bootstrap/datatable';
import { mpTransferState } from '@mintplayer/vue-bootstrap/machine';

/**
 * #450, Vue: the scenarios of the Angular `datatable-ssr-pageload.spec.ts` (a
 * fetch whose response carries extra) in all three ways an app runs it, wired
 * like the demo: `createSSRApp` + `mpTransferState` on both sides,
 * `renderToString` on the server and `mount` to hydrate.
 */
const EXTRA = { columns: ['name', 'year'], disabledActions: ['delete'] };
const ROWS = [{ id: 1, name: 'A Sky Full of Stars', year: 2014 }];
const COLUMNS: DatatableColumnDef[] = [
  { name: 'name', label: 'Name' },
  { name: 'year', label: 'Year' },
];

type Phase = 'server' | 'client';
let calls: Record<Phase, number>;
let loads: { phase: Phase; detail: DatatablePageLoadDetail }[];
let phase: Phase;

const fetch: DatatableFetch = async () => {
  calls[phase]++;
  return { data: ROWS, totalRecords: ROWS.length, extra: EXTRA };
};

const QueryGrid = (stateKey: string | null) =>
  defineComponent({
    render: () =>
      h(BsDatatable, {
        stateKey,
        perPage: 10,
        columns: COLUMNS,
        fetch,
        onPageload: (detail: DatatablePageLoadDetail) => loads.push({ phase, detail }),
      }),
  });

async function renderOnServer(stateKey: string | null) {
  phase = 'server';
  const store = createTransferStore();
  const app = createSSRApp(QueryGrid(stateKey));
  app.use(mpTransferState({ store, server: true }));
  const html = await renderToString(app);
  return { html, head: serializeTransferState(store) };
}

const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
};

const clientLoads = () => loads.filter((l) => l.phase === 'client').map((l) => l.detail);
const cells = (host: HTMLElement) => [...host.querySelectorAll('tbody td')].map((td) => td.textContent?.trim());
const headers = (host: HTMLElement) => host.querySelectorAll('thead th').length;
const request = { parentId: null, page: 1, perPage: 10, sortColumns: [], filters: {}, params: undefined };
const result = { data: ROWS, totalRecords: 1, extra: EXTRA };

describe('BsDatatable with and without a server render (#450)', () => {
  let host: HTMLElement;
  let app: App | null = null;
  let warn: MockInstance<typeof console.warn>;

  beforeEach(() => {
    calls = { server: 0, client: 0 };
    loads = [];
    host = document.createElement('div');
    document.body.append(host);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    app?.unmount();
    app = null;
    host.remove();
    document.getElementById('mp-state')?.remove();
    warn.mockRestore();
  });

  /** Vue reports a hydration mismatch as a warning, not an error. */
  const hydrationWarnings = () => warn.mock.calls.map((args: unknown[]) => String(args[0])).filter((text: string) => /hydration/i.test(text));

  /** Puts the server output on the page and hydrates it, as the demo's main.ts does. */
  const hydrate = async (server: { html: string; head: string }, stateKey: string | null) => {
    document.head.insertAdjacentHTML('beforeend', server.head);
    host.innerHTML = server.html;
    phase = 'client';
    const serverCell = host.querySelector('tbody td');
    app = createSSRApp(QueryGrid(stateKey));
    app.use(mpTransferState());
    app.mount(host);
    await settle();
    return serverCell;
  };

  it('server render with stateKey: hydrates, pageload fires once seeded with extra intact, no browser fetch', async () => {
    const server = await renderOnServer('songs');
    expect(calls.server).toBe(1);
    expect(server.html).toContain('A Sky Full of Stars');
    expect(server.head).toContain('mp-dt:songs:');

    const serverCell = await hydrate(server, 'songs');
    expect(hydrationWarnings()).toEqual([]);
    expect(serverCell).not.toBeNull();
    expect(host.querySelector('tbody td')).toBe(serverCell);
    expect(calls.client).toBe(0);
    expect(loads.filter((l) => l.phase === 'server')).toEqual([]);
    expect(clientLoads()).toEqual([{ request, result, seeded: true }]);
    expect(cells(host)).toContain('A Sky Full of Stars');
    expect(headers(host)).toBeGreaterThan(0);
  });

  it('server render without stateKey: no prefetch, the browser fetches page 1 and pageload reports it unseeded', async () => {
    const server = await renderOnServer(null);
    expect(calls.server).toBe(0);
    expect(server.html).not.toContain('A Sky Full of Stars');

    await hydrate(server, null);
    expect(hydrationWarnings()).toEqual([]);
    expect(calls.client).toBe(1);
    expect(clientLoads()).toEqual([{ request, result, seeded: false }]);
    expect(cells(host)).toContain('A Sky Full of Stars');
    expect(headers(host)).toBeGreaterThan(0);
  });

  it('no server render: the browser fetches page 1 once, pageload reports it unseeded, and the grid renders', async () => {
    phase = 'client';
    app = createApp(QueryGrid('songs'));
    app.use(mpTransferState());
    app.mount(host);
    await settle();
    expect(calls).toEqual({ server: 0, client: 1 });
    expect(clientLoads()).toEqual([{ request, result, seeded: false }]);
    expect(cells(host)).toContain('A Sky Full of Stars');
    expect(headers(host)).toBeGreaterThan(0);
  });
});
