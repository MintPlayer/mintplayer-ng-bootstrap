import { BsCheckbox } from '@mintplayer/react-bootstrap/checkbox';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = "<BsCheckbox />";

export function CheckboxPage() {
  return (
    <div className="demo-page">
      <h1>Checkbox</h1>
      <section>
        <h2>Default</h2>
        <BsCheckbox />
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
