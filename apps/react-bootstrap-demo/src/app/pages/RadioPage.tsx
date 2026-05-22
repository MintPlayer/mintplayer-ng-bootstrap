import { BsRadio } from '@mintplayer/react-bootstrap/radio';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = "<BsRadio />";

export function RadioPage() {
  return (
    <div className="demo-page">
      <h1>Radio</h1>
      <section>
        <h2>Default</h2>
        <BsRadio />
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
