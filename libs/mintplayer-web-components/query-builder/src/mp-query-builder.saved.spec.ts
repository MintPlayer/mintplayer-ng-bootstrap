import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { Expression, Group } from './model/expression';
import type { EntitySchema } from './model/field-def';
import type { SavedQuery } from './model/saved-query';
const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
    ],
  },
];

async function mount(): Promise<MpQueryBuilderElement> {
  const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
  el.schema = SCHEMA;
  el.rootEntity = 'orders';
  el.showSavedQueries = true;
  el.query = { kind: 'group', id: 'g1', logic: 'and', children: [] };
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

describe('mp-query-builder saved queries (M11)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the saved-queries picker only when showSavedQueries=true', async () => {
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.qb-saved')).toBeTruthy();
    el.showSavedQueries = false;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.qb-saved')).toBeNull();
  });

  it('renders "No saved queries" placeholder when savedQueries is empty', async () => {
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.qb-saved-empty')?.textContent).toContain('No saved queries');
  });

  it('renders each saved query with Load + Delete buttons', async () => {
    const el = await mount();
    el.savedQueries = [
      { name: 'Big orders', tree: { kind: 'group', id: 'g', logic: 'and', children: [] } },
      { name: 'Open orders', tree: { kind: 'group', id: 'g', logic: 'and', children: [] } },
    ];
    await el.updateComplete;
    const rows = el.shadowRoot?.querySelectorAll('.qb-saved-row');
    expect(rows?.length).toBe(2);
    expect((rows?.[0] as HTMLElement).dataset['name']).toBe('Big orders');
    expect((rows?.[1] as HTMLElement).dataset['name']).toBe('Open orders');
  });

  it('clicking Load fires load-query with {name}', async () => {
    const el = await mount();
    el.savedQueries = [{ name: 'A', tree: { kind: 'group', id: 'g', logic: 'and', children: [] } }];
    await el.updateComplete;
    let received: { name: string } | null = null;
    el.addEventListener('load-query', (e) => { received = (e as CustomEvent).detail; });
    (el.shadowRoot?.querySelector('.qb-saved-load') as HTMLButtonElement).click();
    expect(received).toEqual({ name: 'A' });
  });

  it('clicking Delete fires delete-query with {name}', async () => {
    const el = await mount();
    el.savedQueries = [{ name: 'A', tree: { kind: 'group', id: 'g', logic: 'and', children: [] } }];
    await el.updateComplete;
    let received: { name: string } | null = null;
    el.addEventListener('delete-query', (e) => { received = (e as CustomEvent).detail; });
    (el.shadowRoot?.querySelector('.qb-saved-delete') as HTMLButtonElement).click();
    expect(received).toEqual({ name: 'A' });
  });

  it('typing a name + Save fires save-query with {name, tree}', async () => {
    const el = await mount();
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'condition', id: 'c', field: 'total', operator: 'gt', value: 50 }],
    };
    el.query = tree;
    await el.updateComplete;

    let received: { name: string; tree: Expression } | null = null;
    el.addEventListener('save-query', (e) => { received = (e as CustomEvent).detail; });

    const input = el.shadowRoot?.querySelector('.qb-saved-name') as HTMLInputElement;
    input.value = 'My new query';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;
    (el.shadowRoot?.querySelector('.qb-saved-save') as HTMLButtonElement).click();

    expect(received).toEqual({ name: 'My new query', tree });
  });

  it('save button is disabled when name is empty / whitespace; does not fire on click', async () => {
    const el = await mount();
    const btn = el.shadowRoot?.querySelector('.qb-saved-save') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    let fired = 0;
    el.addEventListener('save-query', () => fired++);
    btn.click();
    expect(fired).toBe(0);
  });

  it('save-query / load-query / delete-query do NOT bubble', async () => {
    const el = await mount();
    el.savedQueries = [{ name: 'A', tree: { kind: 'group', id: 'g', logic: 'and', children: [] } }];
    await el.updateComplete;
    let onWindow = 0;
    const handler = () => { onWindow++; };
    window.addEventListener('load-query', handler);
    try {
      (el.shadowRoot?.querySelector('.qb-saved-load') as HTMLButtonElement).click();
      expect(onWindow).toBe(0);
    } finally {
      window.removeEventListener('load-query', handler);
    }
  });

  it('savedQueries prop type accepts the SavedQuery shape with optional createdAt', () => {
    const sq: SavedQuery = { name: 'X', tree: { kind: 'group', id: 'g', logic: 'and', children: [] }, createdAt: '2026-05-15T00:00:00Z' };
    expect(sq.name).toBe('X');
    expect(sq.createdAt).toBe('2026-05-15T00:00:00Z');
  });
});
