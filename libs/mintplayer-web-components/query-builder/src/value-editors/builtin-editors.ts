import type { Operator } from '@mintplayer/web-components/query-builder';
import type { FieldDef, FieldDefOption } from '@mintplayer/web-components/query-builder';
import type { EditorContext, EditorHandle } from '@mintplayer/web-components/query-builder';
import { valueShapeFor } from '@mintplayer/web-components/query-builder';

type BuiltinFactory = (ctx: EditorContext) => EditorHandle;

function makeInput(
  type: 'text' | 'number' | 'date' | 'datetime-local',
  initial: string,
  onInput: (raw: string) => void,
  disabled: boolean,
  extraAttrs: Partial<Record<string, string>> = {},
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.className = 'form-control form-control-sm qb-editor-input';
  input.value = initial;
  if (disabled) input.disabled = true;
  for (const [k, v] of Object.entries(extraAttrs)) {
    if (v !== undefined) input.setAttribute(k, v);
  }
  const handler = () => onInput(input.value);
  input.addEventListener('input', handler);
  input.addEventListener('change', handler);
  return input;
}

function formatScalar(v: unknown, type: FieldDef['type']): string {
  if (v === null || v === undefined) return '';
  if (type === 'date' && v instanceof Date) return v.toISOString().slice(0, 10);
  if (type === 'datetime' && v instanceof Date) return v.toISOString().slice(0, 16);
  if (typeof v === 'string' && (type === 'date' || type === 'datetime')) {
    return type === 'date' ? v.slice(0, 10) : v.slice(0, 16);
  }
  return String(v);
}

function parseScalar(raw: string, type: FieldDef['type']): unknown {
  if (raw === '') return null;
  switch (type) {
    case 'number': return Number(raw);
    case 'integer': return Number.parseInt(raw, 10);
    case 'date':
    case 'datetime':
      return raw; // Keep as ISO string; backend parses.
    default:
      return raw;
  }
}

function scalarFactory(type: 'string' | 'number' | 'integer' | 'date' | 'datetime'): BuiltinFactory {
  return (ctx) => {
    const inputType: 'text' | 'number' | 'date' | 'datetime-local' =
      type === 'string' ? 'text'
      : type === 'date' ? 'date'
      : type === 'datetime' ? 'datetime-local'
      : 'number';
    const extra: Partial<Record<string, string>> = {};
    if (type === 'integer') extra['step'] = '1';
    if (type === 'number') extra['step'] = 'any';
    const initial = formatScalar(ctx.value, type);
    const el = makeInput(
      inputType,
      initial,
      (raw) => ctx.onChange(parseScalar(raw, type)),
      ctx.disabled,
      extra,
    );
    el.setAttribute('aria-label', ctx.field.label);
    return { element: el };
  };
}

function tupleFactory(scalarType: 'number' | 'integer' | 'date' | 'datetime'): BuiltinFactory {
  return (ctx) => {
    const wrap = document.createElement('span');
    wrap.className = 'qb-editor-tuple';
    const [v0, v1] = Array.isArray(ctx.value)
      ? [ctx.value[0] ?? null, ctx.value[1] ?? null]
      : [null, null];

    const update = (idx: 0 | 1, raw: string): void => {
      const current = Array.isArray(ctx.value)
        ? [ctx.value[0] ?? null, ctx.value[1] ?? null]
        : [null, null];
      current[idx] = parseScalar(raw, scalarType);
      ctx.onChange(current);
    };

    const fmt = (v: unknown) => formatScalar(v, scalarType);
    const inputType: 'text' | 'number' | 'date' | 'datetime-local' =
      scalarType === 'date' ? 'date'
      : scalarType === 'datetime' ? 'datetime-local'
      : 'number';
    const extra: Partial<Record<string, string>> = {};
    if (scalarType === 'integer') extra['step'] = '1';
    if (scalarType === 'number') extra['step'] = 'any';

    const i0 = makeInput(inputType, fmt(v0), (raw) => update(0, raw), ctx.disabled, extra);
    const i1 = makeInput(inputType, fmt(v1), (raw) => update(1, raw), ctx.disabled, extra);
    i0.setAttribute('aria-label', `${ctx.field.label} (from)`);
    i1.setAttribute('aria-label', `${ctx.field.label} (to)`);
    const sep = document.createElement('span');
    sep.textContent = ' … ';
    sep.className = 'qb-editor-tuple-sep';
    wrap.append(i0, sep, i1);
    return { element: wrap };
  };
}

function nInputFactory(): BuiltinFactory {
  return (ctx) => {
    const initial = typeof ctx.value === 'object' && ctx.value !== null
      ? String((ctx.value as { n?: number }).n ?? 1)
      : '1';
    const el = makeInput(
      'number',
      initial,
      (raw) => {
        const n = Math.max(1, Number.parseInt(raw, 10) || 1);
        ctx.onChange({ n });
      },
      ctx.disabled,
      { min: '1', step: '1' },
    );
    el.classList.add('qb-editor-n-input');
    el.setAttribute('aria-label', `${ctx.field.label} — number of days`);
    return { element: el };
  };
}

function selectFactory(options: FieldDefOption[]): BuiltinFactory {
  return (ctx) => {
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm qb-editor-select';
    select.setAttribute('aria-label', ctx.field.label);
    if (ctx.disabled) select.disabled = true;
    // Empty option for null state.
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '—';
    select.appendChild(empty);
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = opt.label;
      if (ctx.value === opt.value) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener('change', () => {
      if (select.value === '') {
        ctx.onChange(null);
        return;
      }
      const match = options.find((o) => String(o.value) === select.value);
      ctx.onChange(match?.value ?? select.value);
    });
    return { element: select };
  };
}

function multiSelectFactory(options: FieldDefOption[]): BuiltinFactory {
  return (ctx) => {
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm qb-editor-multiselect';
    select.multiple = true;
    select.setAttribute('aria-label', ctx.field.label);
    if (ctx.disabled) select.disabled = true;
    const current = Array.isArray(ctx.value) ? ctx.value : [];
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = opt.label;
      if (current.includes(opt.value)) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener('change', () => {
      const chosen = Array.from(select.selectedOptions).map((o) => {
        const match = options.find((opt) => String(opt.value) === o.value);
        return match?.value ?? o.value;
      });
      ctx.onChange(chosen);
    });
    return { element: select };
  };
}

function chipInputFactory(parser: (raw: string) => unknown): BuiltinFactory {
  return (ctx) => {
    const wrap = document.createElement('span');
    wrap.className = 'qb-editor-chip-input';

    const renderChips = (): void => {
      wrap.innerHTML = '';
      const arr = Array.isArray(ctx.value) ? ctx.value : [];
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        const chip = document.createElement('span');
        chip.className = 'qb-editor-chip';
        chip.textContent = String(v);
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'qb-editor-chip-remove';
        close.setAttribute('aria-label', `Remove ${String(v)}`);
        close.textContent = '×';
        if (ctx.disabled) close.disabled = true;
        close.addEventListener('click', () => {
          const next = (Array.isArray(ctx.value) ? ctx.value : []).filter((_, idx) => idx !== i);
          ctx.onChange(next);
        });
        chip.appendChild(close);
        wrap.appendChild(chip);
      }
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control form-control-sm qb-editor-chip-add';
      input.placeholder = '+ add';
      input.size = 8;
      input.setAttribute('aria-label', `${ctx.field.label} — add value`);
      if (ctx.disabled) input.disabled = true;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim() !== '') {
          e.preventDefault();
          const parsed = parser(input.value.trim());
          const next = [...(Array.isArray(ctx.value) ? ctx.value : []), parsed];
          input.value = '';
          ctx.onChange(next);
        }
      });
      wrap.appendChild(input);
    };

    renderChips();
    return {
      element: wrap,
      dispose: () => {
        // Nothing to clean up beyond removing the element from the DOM (caller handles).
      },
    };
  };
}

export function resolveBuiltinEditor(
  field: FieldDef,
  operator: Operator,
): BuiltinFactory | null {
  const shape = valueShapeFor(operator);
  if (shape === 'null') return null;

  // n-input: only last-n-days / next-n-days
  if (shape === 'n-input') return nInputFactory();

  // tuple: between / not-between (numeric or date)
  if (shape === 'tuple') {
    const t = field.type;
    if (t === 'number' || t === 'integer' || t === 'date' || t === 'datetime') {
      return tupleFactory(t);
    }
    // Fallback: pretend it's number.
    return tupleFactory('number');
  }

  // array: in/not-in (when field is scalar) OR any-of/all-of/none-of (when field is array)
  if (shape === 'array') {
    // Enum with options → multi-select.
    if (field.options && field.options.length > 0) {
      return multiSelectFactory(field.options);
    }
    // Free-form chip input. Parser depends on field type.
    if (field.type === 'number' || field.type === 'integer') {
      return chipInputFactory((raw) =>
        field.type === 'integer' ? Number.parseInt(raw, 10) : Number(raw),
      );
    }
    return chipInputFactory((raw) => raw);
  }

  // scalar:
  if (field.type === 'enum' && field.options && field.options.length > 0) {
    return selectFactory(field.options);
  }
  if (field.type === 'string') return scalarFactory('string');
  if (field.type === 'number') return scalarFactory('number');
  if (field.type === 'integer') return scalarFactory('integer');
  if (field.type === 'date') return scalarFactory('date');
  if (field.type === 'datetime') return scalarFactory('datetime');
  // boolean: no value editor — all boolean ops are parameterless.
  // relation: handled by mp-query-subquery, not here.
  // array: only used with array-shaped operators (handled above).
  return null;
}
