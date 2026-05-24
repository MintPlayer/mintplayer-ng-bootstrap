import { useState } from 'react';
import { BsSelect } from '@mintplayer/react-bootstrap/select';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

interface Dish {
  id: number;
  name: string;
}

const DISHES: Dish[] = [
  { id: 1, name: 'Salmon' },
  { id: 2, name: 'Spaghetti' },
  { id: 3, name: 'Lasagna' },
];

// `<mp-select>`'s value-space is string only — to bind objects, encode the
// selection via the option's `id` and look up the object on change. The
// Angular wrapper does this for you via the BsSelectValueAccessor's
// `optionMap`; React (no two-way ngModel) wires it explicitly.
const SOURCE = `<BsSelect value={String(selected?.id ?? '')}
          onValueChange={e => setSelected(DISHES.find(d => d.id === Number(e.detail.value)) ?? null)}>
  <option value="">Choose a dish</option>
  {DISHES.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
</BsSelect>`;

export function SelectPage() {
  const [selected, setSelected] = useState<Dish | null>(null);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');

  return (
    <div className="demo-page">
      <h1>Select</h1>
      <p className="text-body-secondary">
        A Bootstrap-styled <code>&lt;select&gt;</code> wrapped as a web
        component. Project <code>&lt;option&gt;</code> children declaratively
        — the WC mirrors them into its shadow <code>&lt;select&gt;</code>.
        Listen to <code>onValueChange</code> for the string value.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsSelect
          value={String(selected?.id ?? '')}
          onValueChange={(e) =>
            setSelected(DISHES.find((d) => d.id === Number(e.detail.value)) ?? null)
          }
        >
          <option value="">Choose a dish</option>
          {DISHES.map((d) => (
            <option key={d.id} value={String(d.id)}>{d.name}</option>
          ))}
        </BsSelect>
        <p className="text-body-secondary mt-2">
          Selected: <code>{JSON.stringify(selected)}</code>
        </p>
      </section>

      <section>
        <h2>Size variants</h2>
        <div className="d-flex gap-2 mb-2">
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <label key={s} className="form-check form-check-inline">
              <input
                type="radio"
                className="form-check-input"
                name="size"
                value={s}
                checked={size === s}
                onChange={() => setSize(s)}
              />
              <span className="form-check-label">{s}</span>
            </label>
          ))}
        </div>
        <BsSelect size={size} aria-label="Sized example">
          <option value="">Pick one</option>
          <option value="a">Apple</option>
          <option value="b">Banana</option>
          <option value="c">Cherry</option>
        </BsSelect>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
