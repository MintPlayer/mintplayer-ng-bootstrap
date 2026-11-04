import { useState } from 'react';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsResizable } from '@mintplayer/react-bootstrap/resizable';
import './ResizablePage.css';

const TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sit consectetur ipsam qui libero commodi facilis velit ' +
  'voluptatum, ad aliquam soluta, repellat adipisci dignissimos nostrum suscipit fuga autem aut expedita ullam.';

const PRESET = { left: 16, top: 16, width: 320, height: 160 };

const INLINE_SOURCE = `import { BsResizable } from '@mintplayer/react-bootstrap/resizable';

<BsResizable>
  <div className="p-2 h-100">Drag any edge, or focus it and use the arrow keys.</div>
</BsResizable>`;

const ABSOLUTE_SOURCE = `<div className="position-relative stage">
  <BsResizable positioning="absolute" presetPosition={{ left: 16, top: 16, width: 320, height: 160 }}>
    <div className="p-2 h-100">…</div>
  </BsResizable>
</div>`;

export function ResizablePage() {
  const [size, setSize] = useState('');
  return (
    <div className="demo-page">
      <h1>Resizable</h1>
      <p className="text-body-secondary">
        <code>BsResizable</code> wraps any content in a box with draggable edges and corners. Each glyph is also a
        focusable separator: the arrow keys move its edge by 10px, Shift by 1px. Inline positioning grows the box by
        giving back margin, so the content around it stays put; <code>positioning="absolute"</code> writes its own
        size and offset inside a positioned ancestor. <code>labels</code> translates the glyphs' names.
      </p>

      <section>
        <h2>Inline positioning</h2>
        <BsResizable onResized={(g) => setSize(g.width === null ? '' : `${g.width}px wide`)}>
          <div className="p-2 h-100 resizable-demo-box">
            <p>{TEXT}</p>
          </div>
        </BsResizable>
        <p className="mt-2">Last resize: <code>{size || 'none yet'}</code></p>
        <BsCodeSnippet code={INLINE_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Absolute positioning</h2>
        <div className="position-relative resizable-demo-stage border">
          <BsResizable positioning="absolute" presetPosition={PRESET}>
            <div className="p-2 h-100 resizable-demo-box">
              <p>{TEXT}</p>
            </div>
          </BsResizable>
        </div>
        <BsCodeSnippet code={ABSOLUTE_SOURCE} language="tsx" />
      </section>
    </div>
  );
}
