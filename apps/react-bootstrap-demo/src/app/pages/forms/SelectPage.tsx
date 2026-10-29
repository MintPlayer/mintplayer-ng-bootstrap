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

// A native <select>: its value space is strings. To bind objects, encode the
// selection as the option's id and look the object up on change (Angular's
// [ngValue] does this for you).
const SOURCE = `<BsSelect aria-label="Dish"
          value={String(selected?.id ?? '')}
          onValueChange={({ value }) => setSelected(DISHES.find(d => d.id === Number(value)) ?? null)}>
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
        A native <code>&lt;select class="form-select"&gt;</code>: it opens,
        picks and submits with JavaScript off. Pass <code>options</code>, or put
        <code>&lt;option&gt;</code> children inside. <code>onValueChange</code>
        receives <code>{"{ value, values }"}</code>.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsSelect
          aria-label="Dish"
          value={String(selected?.id ?? '')}
          onValueChange={({ value }) =>
            setSelected(DISHES.find((d) => d.id === Number(value)) ?? null)
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
