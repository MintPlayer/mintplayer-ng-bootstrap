import { describe, expect, it } from 'vitest';
import { html } from 'lit';

import '@mintplayer/web-components/datatable';
import type { FilterContext } from '@mintplayer/ui-core/datatable';

/**
 * #465 T1/T7: a column's custom filter panel (`filterRenderer`) is created on
 * its first open and kept after that; its element and its own state survive a
 * close, and `ctx` reaches it in place, also after `filters` is set from
 * outside.
 */
let constructed = 0;

class ProbePanel extends HTMLElement {
  bumps = 0;
  #ctx: FilterContext | null = null;
  constructor() {
    super();
    constructed++;
  }
  set ctx(ctx: FilterContext) {
    this.#ctx = ctx;
    this.dataset['term'] = ctx.term;
    this.dataset['selected'] = ctx.selection.values.map((v) => String(v.value)).join(',');
  }
  get ctx(): FilterContext {
    return this.#ctx!;
  }
}
customElements.define('probe-filter-panel', ProbePanel);

async function settle(el: Element): Promise<void> {
  await (el as { updateComplete?: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as { updateComplete?: Promise<unknown> }).updateComplete;
}

describe('mp-datatable custom filter panel keep-alive (#465)', () => {
  it('keeps the panel element and its state across close and reopen, with a live ctx', async () => {
    constructed = 0;
    document.body.innerHTML = '<mp-datatable></mp-datatable>';
    const el = document.querySelector('mp-datatable') as unknown as HTMLElement & { columns: unknown; data: unknown; filterRenderer: unknown; filters: unknown };
    el.columns = [{ name: 'name', label: 'Name', filterable: true, filterMode: 'custom' }];
    el.data = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Bravo' },
    ];
    el.filterRenderer = ({ ctx }: { ctx: FilterContext }) => html`<probe-filter-panel .ctx=${ctx}></probe-filter-panel>`;
    await settle(el);
    const panel = el.querySelector<HTMLElement>('[data-dt-filter-panel="name"]')!;
    const toggle = async (newState: 'open' | 'closed') => {
      panel.dispatchEvent(Object.assign(new Event('toggle'), { newState }));
      await settle(el);
    };

    await toggle('open');
    const probe = panel.querySelector<ProbePanel>('probe-filter-panel')!;
    probe.bumps = 2;
    el.filters = { name: { values: ['Alpha'], inverse: false } };
    await settle(el);
    expect(panel.querySelector('probe-filter-panel')).toBe(probe);
    expect(probe.dataset['selected']).toBe('Alpha');
    await toggle('closed');
    await toggle('open');
    expect(panel.querySelector('probe-filter-panel')).toBe(probe);
    expect(probe.bumps).toBe(2);
    expect(probe.dataset['selected']).toBe('Alpha');
    expect(probe.dataset['term']).toBe('');
    expect(constructed).toBe(1);
  });
});
