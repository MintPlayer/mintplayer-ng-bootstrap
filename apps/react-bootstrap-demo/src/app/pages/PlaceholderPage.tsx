import { useState } from 'react';
import { BsPlaceholder } from '@mintplayer/react-bootstrap/placeholder';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const LINES = ['Cras justo odio', 'Dapibus ac facilisis in', 'Morbi leo risus'];

const SOURCE = `import { BsPlaceholder } from '@mintplayer/react-bootstrap/placeholder';

<BsPlaceholder loading={loading}>
  <h5 data-placeholder-field>Featured</h5>
  <p data-placeholder-field>{text}</p>
</BsPlaceholder>`;

export function PlaceholderPage() {
  const [loading, setLoading] = useState(true);
  return (
    <div className="demo-page">
      <h1>Placeholders</h1>
      <p className="text-body-secondary">
        While <code>loading</code>, every element marked <code>data-placeholder-field</code> renders
        as a glowing skeleton bar and the region is <code>aria-busy</code>; when loading ends,
        <code> loadedText</code> is announced once.
      </p>

      <section>
        <h2>Basic usage</h2>
        <div className="form-check form-switch mb-2">
          <input id="placeholder-loading" className="form-check-input" type="checkbox" role="switch" checked={loading} onChange={(e) => setLoading(e.target.checked)} />
          <label className="form-check-label" htmlFor="placeholder-loading">Loading</label>
        </div>
        <BsPlaceholder loading={loading}>
          <h5 data-placeholder-field>Featured</h5>
          {LINES.map((line) => (
            <p key={line} className="mb-1"><span data-placeholder-field>{line}</span></p>
          ))}
        </BsPlaceholder>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
