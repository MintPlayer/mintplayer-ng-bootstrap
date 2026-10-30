import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import { createTransferStore, serializeTransferState } from '@mintplayer/ui-core/transfer-state';
import type { DatatableColumnDef, DatatableFetch, DatatablePageLoadDetail } from '@mintplayer/ui-core/datatable';
import { MpTransferStateProvider } from '../../machine/src/transfer-state';
import { BsDatatable } from '../../datatable/src/generated';

/**
 * #450, React: the scenarios of the Angular `datatable-ssr-pageload.spec.ts`
 * (a fetch whose response carries extra) in all three ways an app runs it:
 * server render with stateKey then hydration, server render without stateKey,
 * and no server render at all.
 */
const EXTRA = { columns: ['name', 'year'], disabledActions: ['delete'] };
const ROWS = [{ id: 1, name: 'A Sky Full of Stars', year: 2014 }];

type Phase = 'server' | 'client';
let calls: Record<Phase, number>;
let loads: { phase: Phase; detail: DatatablePageLoadDetail }[];
let phase: Phase;

/**
 * Columns are fixed here. A React streaming render re-renders only the
 * suspended datatable when its prefetch resolves, never this parent, so a
 * consumer cannot render server HTML from what its fetch recorded: metadata
 * the server markup needs is loaded before the render (a route loader). The
 * browser still gets the response's extra through onPageLoad on every path.
 */
const COLUMNS: DatatableColumnDef[] = [
  { name: 'name', label: 'Name' },
  { name: 'year', label: 'Year' },
];

function QueryGrid({ stateKey }: { stateKey: string | null }) {
  const [fetch] = useState<DatatableFetch>(() => async () => {
    calls[phase]++;
    return { data: ROWS, totalRecords: ROWS.length, extra: EXTRA };
  });
  return <BsDatatable stateKey={stateKey} perPage={10} columns={COLUMNS} fetch={fetch} onPageLoad={(detail) => loads.push({ phase, detail })} />;
}

/** Renders like the demo's entry-server: pipeable stream, piped once everything (the prefetch) is ready. */
function renderOnServer(stateKey: string | null): Promise<{ html: string; head: string }> {
  phase = 'server';
  const store = createTransferStore();
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
      final(cb) {
        resolve({ html: Buffer.concat(chunks).toString('utf-8'), head: serializeTransferState(store) });
        cb();
      },
    });
    const { pipe } = renderToPipeableStream(
      <MpTransferStateProvider store={store} server>
        <QueryGrid stateKey={stateKey} />
      </MpTransferStateProvider>,
      { onAllReady: () => pipe(writable), onShellError: reject, onError: reject },
    );
  });
}

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
};

const clientLoads = () => loads.filter((l) => l.phase === 'client').map((l) => l.detail);
const cells = (host: HTMLElement) => [...host.querySelectorAll('tbody td')].map((td) => td.textContent?.trim());
const headers = (host: HTMLElement) => host.querySelectorAll('thead th').length;
const request = { parentId: null, page: 1, perPage: 10, sortColumns: [], filters: {}, params: undefined };
const result = { data: ROWS, totalRecords: 1, extra: EXTRA };

describe('BsDatatable with and without a server render (#450)', () => {
  let host: HTMLElement;
  let root: Root | null = null;
  const hydrationErrors: unknown[] = [];

  beforeEach(() => {
    calls = { server: 0, client: 0 };
    loads = [];
    hydrationErrors.length = 0;
    host = document.createElement('div');
    document.body.append(host);
  });
  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    host.remove();
    document.getElementById('mp-state')?.remove();
  });

  /** Puts the server output on the page and hydrates it, as the demo's entry-client does. */
  const hydrate = async (server: { html: string; head: string }, stateKey: string | null) => {
    document.head.insertAdjacentHTML('beforeend', server.head);
    host.innerHTML = server.html;
    phase = 'client';
    const serverCell = host.querySelector('tbody td');
    await act(async () => {
      root = hydrateRoot(
        host,
        <MpTransferStateProvider>
          <QueryGrid stateKey={stateKey} />
        </MpTransferStateProvider>,
        { onRecoverableError: (error) => hydrationErrors.push(error) },
      );
    });
    await settle();
    return serverCell;
  };

  it('server render with stateKey: hydrates, pageLoad fires once seeded with extra intact, no browser fetch', async () => {
    const server = await renderOnServer('songs');
    expect(calls.server).toBe(1);
    expect(server.html).toContain('A Sky Full of Stars');
    expect(server.head).toContain('mp-dt:songs:');

    const serverCell = await hydrate(server, 'songs');
    expect(hydrationErrors).toEqual([]);
    expect(serverCell).not.toBeNull();
    expect(host.querySelector('tbody td')).toBe(serverCell);
    expect(calls.client).toBe(0);
    expect(loads.filter((l) => l.phase === 'server')).toEqual([]);
    expect(clientLoads()).toEqual([{ request, result, seeded: true }]);
    expect(cells(host)).toContain('A Sky Full of Stars');
    expect(headers(host)).toBeGreaterThan(0);
  });

  it('server render without stateKey: no prefetch, the browser fetches page 1 and pageLoad reports it unseeded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const server = await renderOnServer(null);
    warn.mockRestore();
    expect(calls.server).toBe(0);
    expect(server.html).not.toContain('A Sky Full of Stars');

    await hydrate(server, null);
    expect(hydrationErrors).toEqual([]);
    expect(calls.client).toBe(1);
    expect(clientLoads()).toEqual([{ request, result, seeded: false }]);
    expect(cells(host)).toContain('A Sky Full of Stars');
    expect(headers(host)).toBeGreaterThan(0);
  });

  it('no server render: the browser fetches page 1 once, pageLoad reports it unseeded, and the grid renders', async () => {
    phase = 'client';
    await act(async () => {
      root = createRoot(host);
      root.render(
        <MpTransferStateProvider>
          <QueryGrid stateKey="songs" />
        </MpTransferStateProvider>,
      );
    });
    await settle();
    expect(calls).toEqual({ server: 0, client: 1 });
    expect(clientLoads()).toEqual([{ request, result, seeded: false }]);
    expect(cells(host)).toContain('A Sky Full of Stars');
    expect(headers(host)).toBeGreaterThan(0);
  });
});
