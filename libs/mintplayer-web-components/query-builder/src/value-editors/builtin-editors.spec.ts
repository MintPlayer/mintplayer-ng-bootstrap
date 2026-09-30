import { describe, it, expect } from 'vitest';
import { resolveBuiltinEditor } from './builtin-editors';
import type { FieldDef } from '../model/field-def';
import type { EditorContext } from '../model/editor';

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

// The host (mp-query-condition) creates an editor ONCE per field|operator|
// disabled|registry key and keeps it across value changes, so ctx.value is the
// value at creation time for the editor's whole life. An editor that rebuilds
// its next value from ctx.value drops every edit but the last.
describe('builtin editors keep their own edits (ctx.value is creation-time only)', () => {
  it('between: editing "from" then "to" emits both bounds', () => {
    const f: FieldDef = { name: 'total', label: 'Total', type: 'number' };
    const { ctx, changes } = makeCtx(f, 'between', [null, null]);
    const { element } = resolveBuiltinEditor(f, 'between')!(ctx);
    const [from, to] = Array.from(element.querySelectorAll('input'));
    from!.value = '5';
    from!.dispatchEvent(new Event('input'));
    to!.value = '10';
    to!.dispatchEvent(new Event('input'));
    expect(changes.at(-1)).toEqual([5, 10]);
  });

  it('chip input: adding two chips in a row keeps both, and both are rendered', () => {
    const f: FieldDef = { name: 'name', label: 'Name', type: 'string' };
    const { ctx, changes } = makeCtx(f, 'in', []);
    const { element } = resolveBuiltinEditor(f, 'in')!(ctx);
    const add = (v: string): void => {
      const input = element.querySelector('.qb-editor-chip-add') as HTMLInputElement;
      input.value = v;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    };
    add('Alice');
    add('Bob');
    expect(changes.at(-1)).toEqual(['Alice', 'Bob']);
    expect(Array.from(element.querySelectorAll('.qb-editor-chip')).map((c) => c.firstChild?.textContent))
      .toEqual(['Alice', 'Bob']);
  });

  it('chip input: removing a chip emits the remaining values and drops it from the DOM', () => {
    const f: FieldDef = { name: 'name', label: 'Name', type: 'string' };
    const { ctx, changes } = makeCtx(f, 'in', ['Alice', 'Bob', 'Carol']);
    const { element } = resolveBuiltinEditor(f, 'in')!(ctx);
    (element.querySelectorAll('.qb-editor-chip-remove')[1] as HTMLButtonElement).click();
    expect(changes.at(-1)).toEqual(['Alice', 'Carol']);
    expect(element.querySelectorAll('.qb-editor-chip')).toHaveLength(2);
    // A second removal works against the already-reduced list.
    (element.querySelectorAll('.qb-editor-chip-remove')[0] as HTMLButtonElement).click();
    expect(changes.at(-1)).toEqual(['Carol']);
  });

  it('chip input: the add box keeps focus after adding a chip', () => {
    const f: FieldDef = { name: 'name', label: 'Name', type: 'string' };
    const { ctx } = makeCtx(f, 'in', []);
    const { element } = resolveBuiltinEditor(f, 'in')!(ctx);
    document.body.appendChild(element);
    const input = element.querySelector('.qb-editor-chip-add') as HTMLInputElement;
    input.focus();
    input.value = 'Alice';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(document.activeElement).toBe(element.querySelector('.qb-editor-chip-add'));
    element.remove();
  });
});

describe('builtin editor parsing and formatting', () => {
  it('integer chip input parses entries as integers', () => {
    const f: FieldDef = { name: 'qty', label: 'Qty', type: 'integer' };
    const { ctx, changes } = makeCtx(f, 'in', []);
    const { element } = resolveBuiltinEditor(f, 'in')!(ctx);
    const input = element.querySelector('.qb-editor-chip-add') as HTMLInputElement;
    input.value = '7.9';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(changes).toEqual([[7]]);
  });

  it('number chip input parses entries as numbers', () => {
    const f: FieldDef = { name: 'total', label: 'Total', type: 'number' };
    const { ctx, changes } = makeCtx(f, 'in', []);
    const { element } = resolveBuiltinEditor(f, 'in')!(ctx);
    const input = element.querySelector('.qb-editor-chip-add') as HTMLInputElement;
    input.value = '7.5';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(changes).toEqual([[7.5]]);
  });

  it('chip input ignores Enter on a blank entry and other keys', () => {
    const f: FieldDef = { name: 'name', label: 'Name', type: 'string' };
    const { ctx, changes } = makeCtx(f, 'in', []);
    const { element } = resolveBuiltinEditor(f, 'in')!(ctx);
    const input = element.querySelector('.qb-editor-chip-add') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    input.value = 'x';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(changes).toEqual([]);
  });

  it('disabled chip input disables the add box and every remove button', () => {
    const f: FieldDef = { name: 'name', label: 'Name', type: 'string' };
    const ctx: EditorContext = {
      field: f, operator: 'in', value: ['a'], disabled: true, onChange: () => undefined,
    };
    const { element } = resolveBuiltinEditor(f, 'in')!(ctx);
    expect((element.querySelector('.qb-editor-chip-add') as HTMLInputElement).disabled).toBe(true);
    expect((element.querySelector('.qb-editor-chip-remove') as HTMLButtonElement).disabled).toBe(true);
  });

  it('a non-array value renders an empty chip list', () => {
    const f: FieldDef = { name: 'name', label: 'Name', type: 'string' };
    const { ctx } = makeCtx(f, 'in', 'not-an-array');
    const { element } = resolveBuiltinEditor(f, 'in')!(ctx);
    expect(element.querySelectorAll('.qb-editor-chip')).toHaveLength(0);
  });

  it('enum select: choosing the empty option emits null', () => {
    const f: FieldDef = {
      name: 'st', label: 'St', type: 'enum',
      options: [{ value: 1, label: 'One' }, { value: 2, label: 'Two' }],
    };
    const { ctx, changes } = makeCtx(f, 'equals', 1);
    const { element } = resolveBuiltinEditor(f, 'equals')!(ctx);
    const select = element as HTMLSelectElement;
    select.value = '';
    select.dispatchEvent(new Event('change'));
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    // The option's typed value comes back, not its string form.
    expect(changes).toEqual([null, 2]);
  });

  it('multi-select returns typed option values and treats a non-array value as none selected', () => {
    const f: FieldDef = {
      name: 'n', label: 'N', type: 'array',
      options: [{ value: 1, label: 'One' }, { value: 2, label: 'Two' }],
    };
    const { ctx, changes } = makeCtx(f, 'any-of', null);
    const { element } = resolveBuiltinEditor(f, 'any-of')!(ctx);
    const select = element as HTMLSelectElement;
    expect(select.selectedOptions).toHaveLength(0);
    select.options[1]!.selected = true;
    select.dispatchEvent(new Event('change'));
    expect(changes).toEqual([[2]]);
  });

  it('date between formats Date and ISO-string bounds to YYYY-MM-DD', () => {
    const f: FieldDef = { name: 'd', label: 'D', type: 'date' };
    const { ctx } = makeCtx(f, 'between', [new Date('2026-03-04T10:00:00Z'), '2026-05-06T11:22:33Z']);
    const { element } = resolveBuiltinEditor(f, 'between')!(ctx);
    const [from, to] = Array.from(element.querySelectorAll('input'));
    expect(from!.type).toBe('date');
    expect([from!.value, to!.value]).toEqual(['2026-03-04', '2026-05-06']);
  });

  it('datetime between uses datetime-local and keeps minutes precision', () => {
    const f: FieldDef = { name: 'dt', label: 'DT', type: 'datetime' };
    const { ctx, changes } = makeCtx(f, 'between', [new Date('2026-03-04T10:15:00Z'), null]);
    const { element } = resolveBuiltinEditor(f, 'between')!(ctx);
    const [from, to] = Array.from(element.querySelectorAll('input'));
    expect(from!.type).toBe('datetime-local');
    expect(from!.value).toBe('2026-03-04T10:15');
    to!.value = '2026-03-05T08:00';
    to!.dispatchEvent(new Event('input'));
    // The untouched bound is passed through as given; the edited one is the input's ISO text.
    expect(changes).toEqual([[new Date('2026-03-04T10:15:00Z'), '2026-03-05T08:00']]);
  });

  it('integer between steps by 1 and parses integers; a non-array value starts empty', () => {
    const f: FieldDef = { name: 'q', label: 'Q', type: 'integer' };
    const { ctx, changes } = makeCtx(f, 'between', 'garbage');
    const { element } = resolveBuiltinEditor(f, 'between')!(ctx);
    const [from] = Array.from(element.querySelectorAll('input'));
    expect(from!.getAttribute('step')).toBe('1');
    expect(from!.value).toBe('');
    from!.value = '3';
    from!.dispatchEvent(new Event('input'));
    expect(changes).toEqual([[3, null]]);
  });

  it('between on a non-numeric field falls back to number inputs', () => {
    const f: FieldDef = { name: 's', label: 'S', type: 'string' };
    const { ctx } = makeCtx(f, 'between', [1, 2]);
    const { element } = resolveBuiltinEditor(f, 'between')!(ctx);
    expect(Array.from(element.querySelectorAll('input')).map((i) => i.type)).toEqual(['number', 'number']);
  });

  it('datetime equals formats an ISO string to minutes precision', () => {
    const f: FieldDef = { name: 'dt', label: 'DT', type: 'datetime' };
    const { ctx } = makeCtx(f, 'equals', '2026-03-04T10:15:59Z');
    const { element } = resolveBuiltinEditor(f, 'equals')!(ctx);
    expect((element as HTMLInputElement).value).toBe('2026-03-04T10:15');
  });

  it('last-n-days with a missing n starts at 1', () => {
    const f: FieldDef = { name: 'd', label: 'D', type: 'date' };
    const withoutN = makeCtx(f, 'last-n-days', {});
    const withNull = makeCtx(f, 'last-n-days', null);
    expect((resolveBuiltinEditor(f, 'last-n-days')!(withoutN.ctx).element as HTMLInputElement).value).toBe('1');
    expect((resolveBuiltinEditor(f, 'last-n-days')!(withNull.ctx).element as HTMLInputElement).value).toBe('1');
  });

  it('an enum field without options gets no scalar editor', () => {
    expect(resolveBuiltinEditor({ name: 'e', label: 'E', type: 'enum' }, 'equals')).toBeNull();
    expect(resolveBuiltinEditor({ name: 'e', label: 'E', type: 'enum', options: [] }, 'equals')).toBeNull();
  });
});
