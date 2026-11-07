import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, onMounted, ref, type PropType } from 'vue';

import { BsDatatable, type DatatableColumnDef, type FilterContext } from '@mintplayer/vue-bootstrap/datatable';

import { mountEl } from './harness';

/**
 * `BsDatatable` renders the headless datatable itself (#437). The core's spec
 * covers the behaviour; this pins what is Vue's own: two-way inputs write back
 * through `update:x`, outputs are Vue emits, and scoped slots render as Vue
 * content in the header and cells.
 */

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
];
const COLUMNS: DatatableColumnDef[] = [{ name: 'name', label: 'Name' }];

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountTable(options: Record<string, unknown> = {}) {
  const props = { columns: COLUMNS, data: ROWS, ...((options['props'] as object) ?? {}) };
  return mountEl(BsDatatable, 'div.datatable', { ...options, props, attachTo: document.body });
}

describe('BsDatatable', () => {
  it('renders the rows and names the table by the consumer aria-label', () => {
    const { el, wrapper } = mountTable({ attrs: { 'aria-label': 'Artists' } });
    expect(el.querySelector('table')!.getAttribute('aria-label')).toBe('Artists');
    expect([...el.querySelectorAll('tbody td')].map((td) => td.textContent?.trim())).toEqual(['Alpha', 'Beta']);
    wrapper.unmount();
  });

  it('writes a sort back through update:sortColumns', async () => {
    const { el, wrapper } = mountTable();
    el.querySelector<HTMLButtonElement>('[data-dt-sort="name"]')!.click();
    await settle();
    expect(wrapper.emitted('update:sortColumns')?.at(-1)).toEqual([[{ property: 'name', direction: 'ascending' }]]);
    wrapper.unmount();
  });

  it('emits selectionchanged and update:selectedIds on a row click', async () => {
    const { el, wrapper } = mountTable({ props: { selectionMode: 'single' } });
    el.querySelector<HTMLElement>('tbody tr[data-row-key="2"]')!.click();
    await settle();
    expect(wrapper.emitted('update:selectedIds')?.at(-1)).toEqual([['2']]);
    expect(wrapper.emitted('selectionChanged')?.at(-1)).toEqual([{ selectedIds: ['2'], selectedRows: [ROWS[1]] }]);
    expect(wrapper.emitted('rowClick')?.length).toBe(1);
    wrapper.unmount();
  });

  it('renders the header and cell scoped slots as Vue content', async () => {
    const { el, wrapper } = mountTable({
      slots: {
        header: ({ column }: { column: DatatableColumnDef }) => h('b', `head:${column.label}`),
        cell: ({ row }: { row: Row }) => h('i', `cell:${row.name}`),
      },
    });
    await settle();
    expect(el.querySelector('thead b')?.textContent).toBe('head:Name');
    expect([...el.querySelectorAll('tbody i')].map((i) => i.textContent)).toEqual(['cell:Alpha', 'cell:Beta']);
    wrapper.unmount();
  });

  it('keeps a custom filter panel, and its own state, across close and reopen; ctx updates in place (#465 T1/T7)', async () => {
    let mounts = 0;
    const Panel = defineComponent({
      props: { ctx: { type: Object as PropType<FilterContext>, required: true } },
      setup(props) {
        const bumps = ref(0);
        onMounted(() => mounts++);
        return () =>
          h('div', { class: 'probe', 'data-term': props.ctx.term, 'data-selected': props.ctx.selection.values.map((v) => String(v.value)).join(',') }, [
            h('button', { type: 'button', class: 'bump', onClick: () => bumps.value++ }, String(bumps.value)),
          ]);
      },
    });
    const { el, wrapper } = mountTable({
      props: { columns: [{ name: 'name', label: 'Name', filterable: true, filterMode: 'custom' }], filters: {} },
      slots: { filter: ({ ctx }: { ctx: FilterContext }) => h(Panel, { ctx }) },
    });
    await settle();
    const panel = el.querySelector<HTMLElement>('[data-dt-filter-panel="name"]')!;
    const toggle = async (newState: 'open' | 'closed') => {
      const ev = new Event('toggle');
      Object.defineProperty(ev, 'newState', { value: newState });
      panel.dispatchEvent(ev);
      await nextTick();
      await settle();
    };

    await toggle('open');
    const probe = panel.querySelector<HTMLElement>('.probe')!;
    probe.querySelector<HTMLButtonElement>('.bump')!.click();
    probe.querySelector<HTMLButtonElement>('.bump')!.click();
    await wrapper.setProps({ filters: { name: { values: ['Alpha'], inverse: false } } });
    await settle();
    expect(panel.querySelector('.probe')).toBe(probe);
    expect(probe.dataset['selected']).toBe('Alpha');
    await toggle('closed');
    await toggle('open');
    expect(panel.querySelector('.probe')).toBe(probe);
    expect(probe.querySelector('.bump')!.textContent).toBe('2');
    expect(probe.dataset['selected']).toBe('Alpha');
    expect(probe.dataset['term']).toBe('');
    expect(mounts).toBe(1);
    wrapper.unmount();
  });
});
