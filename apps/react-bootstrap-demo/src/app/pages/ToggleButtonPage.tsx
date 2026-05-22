import { BsToggleButton } from '@mintplayer/react-bootstrap/toggle-button';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = "<BsToggleButton>Toggle me</BsToggleButton>";

export function ToggleButtonPage() {
  return (
    <div className="demo-page">
      <h1>Toggle button</h1>
      <section>
        <h2>Default</h2>
        <BsToggleButton>Toggle me</BsToggleButton>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
