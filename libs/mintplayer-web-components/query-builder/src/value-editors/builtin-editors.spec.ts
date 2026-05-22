import { describe, it, expect } from 'vitest';
import { resolveBuiltinEditor } from './builtin-editors';
import type { FieldDef } from '@mintplayer/web-components/query-builder';
import type { EditorContext } from '@mintplayer/web-components/query-builder';

function makeCtx(field: FieldDef, operator: EditorContext['operator'], value: unknown): {
  ctx: EditorContext;
  changes: unknown[];
} {
  const changes: unknown[] = [];
  const ctx: EditorContext = {
    field,
    operator,
    value,
    disabled: false,
    onChange: (v) => changes.push(v),
  };
  return { ctx, changes };
}

describe('resolveBuiltinEditor', () => {
  it('returns null for parameterless operators', () => {
    const f: FieldDef = { name: 'x', label: 'X', type: 'string' };
    expect(resolveBuiltinEditor(f, 'is-null')).toBeNull();
    expect(resolveBuiltinEditor(f, 'is-not-null')).toBeNull();
  });

  it('returns null for any boolean operator (all parameterless)', () => {
    const f: FieldDef = { name: 'active', label: 'Active', type: 'boolean' };
    expect(resolveBuiltinEditor(f, 'is-true')).toBeNull();
    expect(resolveBuiltinEditor(f, 'is-false')).toBeNull();
  });

  it('string equals → text input', () => {
    const f: FieldDef = { name: 's', label: 'S', type: 'string' };
    const factory = resolveBuiltinEditor(f, 'equals')!;
    const { ctx, changes } = makeCtx(f, 'equals', 'hello');
    const { element } = factory(ctx);
    const input = element as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('text');
    expect(input.value).toBe('hello');
    input.value = 'world';
    input.dispatchEvent(new Event('input'));
    expect(changes).toEqual(['world']);
  });

  it('integer equals → number input with step=1; empty string → null', () => {
    const f: FieldDef = { name: 'n', label: 'N', type: 'integer' };
    const factory = resolveBuiltinEditor(f, 'equals')!;
    const { ctx, changes } = makeCtx(f, 'equals', 42);
    const { element } = factory(ctx);
    const input = element as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.getAttribute('step')).toBe('1');
    expect(input.value).toBe('42');
    input.value = '7';
    input.dispatchEvent(new Event('input'));
    expect(changes).toEqual([7]);
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(changes).toEqual([7, null]);
  });

  it('number equals → step="any"', () => {
    const f: FieldDef = { name: 'n', label: 'N', type: 'number' };
    const factory = resolveBuiltinEditor(f, 'equals')!;
    const { ctx } = makeCtx(f, 'equals', 1.5);
    const { element } = factory(ctx);
    expect((element as HTMLInputElement).getAttribute('step')).toBe('any');
  });

  it('date equals → date input; value formatted as YYYY-MM-DD', () => {
    const f: FieldDef = { name: 'd', label: 'D', type: 'date' };
    const factory = resolveBuiltinEditor(f, 'equals')!;
    const { ctx } = makeCtx(f, 'equals', '2026-05-15');
    const { element } = factory(ctx);
    expect((element as HTMLInputElement).type).toBe('date');
    expect((element as HTMLInputElement).value).toBe('2026-05-15');
  });

  it('datetime equals → datetime-local input', () => {
    const f: FieldDef = { name: 'd', label: 'D', type: 'datetime' };
    const factory = resolveBuiltinEditor(f, 'equals')!;
    const { ctx } = makeCtx(f, 'equals', '2026-05-15T10:30');
    const { element } = factory(ctx);
    expect((element as HTMLInputElement).type).toBe('datetime-local');
  });

  it('enum equals (with options) → select; selection fires onChange with the typed value', () => {
    const f: FieldDef = {
      name: 'status',
      label: 'Status',
      type: 'enum',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'paid', label: 'Paid' },
      ],
    };
    const factory = resolveBuiltinEditor(f, 'equals')!;
    const { ctx, changes } = makeCtx(f, 'equals', 'open');
    const { element } = factory(ctx);
    const select = element as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('open');
    select.value = 'paid';
    select.dispatchEvent(new Event('change'));
    expect(changes).toEqual(['paid']);
  });

  it('number between → tuple of two number inputs; updating one fires array onChange', () => {
    const f: FieldDef = { name: 'total', label: 'Total', type: 'number' };
    const factory = resolveBuiltinEditor(f, 'between')!;
    const { ctx, changes } = makeCtx(f, 'between', [10, 100]);
    const { element } = factory(ctx);
    const inputs = element.querySelectorAll('input');
    expect(inputs.length).toBe(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('10');
    expect((inputs[1] as HTMLInputElement).value).toBe('100');
    (inputs[0] as HTMLInputElement).value = '20';
    inputs[0]!.dispatchEvent(new Event('input'));
    expect(changes).toEqual([[20, 100]]);
  });

  it('last-n-days → number input min=1; emits { n }', () => {
    const f: FieldDef = { name: 'orderDate', label: 'Order date', type: 'date' };
    const factory = resolveBuiltinEditor(f, 'last-n-days')!;
    const { ctx, changes } = makeCtx(f, 'last-n-days', { n: 7 });
    const { element } = factory(ctx);
    const input = element as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.getAttribute('min')).toBe('1');
    expect(input.value).toBe('7');
    input.value = '30';
    input.dispatchEvent(new Event('input'));
    expect(changes).toEqual([{ n: 30 }]);
  });

  it('clamps last-n-days to >= 1 even when user types 0', () => {
    const f: FieldDef = { name: 'orderDate', label: 'Order date', type: 'date' };
    const factory = resolveBuiltinEditor(f, 'last-n-days')!;
    const { ctx, changes } = makeCtx(f, 'last-n-days', { n: 7 });
    const { element } = factory(ctx);
    const input = element as HTMLInputElement;
    input.value = '0';
    input.dispatchEvent(new Event('input'));
    expect(changes).toEqual([{ n: 1 }]);
  });

  it('array any-of with options → multi-select; selection fires array onChange', () => {
    const f: FieldDef = {
      name: 'tags',
      label: 'Tags',
      type: 'array',
      options: [
        { value: 'urgent', label: 'Urgent' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'vip', label: 'VIP' },
      ],
    };
    const factory = resolveBuiltinEditor(f, 'any-of')!;
    const { ctx, changes } = makeCtx(f, 'any-of', ['urgent']);
    const { element } = factory(ctx);
    const select = element as HTMLSelectElement;
    expect(select.multiple).toBe(true);
    expect(Array.from(select.selectedOptions).map((o) => o.value)).toEqual(['urgent']);
    // Select both
    select.options[0]!.selected = true;
    select.options[1]!.selected = true;
    select.dispatchEvent(new Event('change'));
    expect(changes).toEqual([['urgent', 'blocked']]);
  });

  it('string in (no options) → chip input; Enter appends a new chip', () => {
    const f: FieldDef = { name: 'name', label: 'Name', type: 'string' };
    const factory = resolveBuiltinEditor(f, 'in')!;
    const { ctx, changes } = makeCtx(f, 'in', ['Alice']);
    const { element } = factory(ctx);
    const chips = element.querySelectorAll('.qb-editor-chip');
    expect(chips.length).toBe(1);
    expect(chips[0]?.textContent).toContain('Alice');
    const addInput = element.querySelector('.qb-editor-chip-add') as HTMLInputElement;
    expect(addInput).toBeTruthy();
    addInput.value = 'Bob';
    addInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(changes).toEqual([['Alice', 'Bob']]);
  });

  it('disabled context propagates to inputs (disabled flag)', () => {
    const f: FieldDef = { name: 's', label: 'S', type: 'string' };
    const factory = resolveBuiltinEditor(f, 'equals')!;
    const ctx: EditorContext = {
      field: f, operator: 'equals', value: 'x', disabled: true, onChange: () => undefined,
    };
    const { element } = factory(ctx);
    expect((element as HTMLInputElement).disabled).toBe(true);
  });
});
