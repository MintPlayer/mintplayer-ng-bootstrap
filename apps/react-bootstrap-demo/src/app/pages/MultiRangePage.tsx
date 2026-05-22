import { BsMultiRange } from '@mintplayer/react-bootstrap/multi-range';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = "<BsMultiRange />";

export function MultiRangePage() {
  return (
    <div className="demo-page">
      <h1>Multi-range</h1>
      <section>
        <h2>Default</h2>
        <BsMultiRange />
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
