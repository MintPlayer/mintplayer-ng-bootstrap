import { useState } from 'react';
import { BsTable } from '@mintplayer/react-bootstrap/table';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const ROWS = [
  { id: 1, first: 'Mark', last: 'Otto', handle: '@mdo' },
  { id: 2, first: 'Jacob', last: 'Thornton', handle: '@fat' },
  { id: 3, first: 'Larry', last: 'Bird', handle: '@twitter' },
];

const SOURCE = `import { BsTable } from '@mintplayer/react-bootstrap/table';

<BsTable striped hover responsive aria-label="People">
  <thead><tr><th>#</th><th>First</th><th>Last</th></tr></thead>
  <tbody>{rows.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.first}</td><td>{r.last}</td></tr>)}</tbody>
</BsTable>`;

export function TablePage() {
  const [striped, setStriped] = useState(true);
  const [bordered, setBordered] = useState(false);
  return (
    <div className="demo-page">
      <h1>Table</h1>
      <p className="text-body-secondary">
        A real <code>&lt;table&gt;</code> around your rows. <code>responsive</code> scrolls inline
        instead of wrapping; <code>striped</code>, <code>hover</code> and <code>bordered</code> are
        Bootstrap's variants. Your <code>aria-*</code> (such as <code>aria-rowcount</code>) land on
        the <code>&lt;table&gt;</code>.
      </p>

      <section>
        <h2>Basic usage</h2>
        <div className="d-flex gap-3 mb-2">
          <label className="form-check"><input type="checkbox" className="form-check-input" checked={striped} onChange={(e) => setStriped(e.target.checked)} /> Striped</label>
          <label className="form-check"><input type="checkbox" className="form-check-input" checked={bordered} onChange={(e) => setBordered(e.target.checked)} /> Bordered</label>
        </div>
        <BsTable striped={striped} bordered={bordered} hover responsive aria-label="People">
          <thead>
            <tr><th>#</th><th>First</th><th>Last</th><th>Handle</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.id}><td>{r.id}</td><td>{r.first}</td><td>{r.last}</td><td>{r.handle}</td></tr>
            ))}
          </tbody>
        </BsTable>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
