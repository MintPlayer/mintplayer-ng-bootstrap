import { useState } from 'react';
import { BsRadio } from '@mintplayer/react-bootstrap/radio';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsRadio name="color" value="red" checked={color === 'red'}
          onChange={e => e.detail.checked && setColor('red')}>Red</BsRadio>
<BsRadio name="color" value="green" checked={color === 'green'}
          onChange={e => e.detail.checked && setColor('green')}>Green</BsRadio>`;

// Each <mp-radio> is in its own shadow root, so the browser's native
// one-of-N (auto-unchecking siblings) can't cross WC boundaries. The
// consumer coordinates with a single piece of state.
export function RadioPage() {
  const [color, setColor] = useState<'red' | 'green' | 'blue'>('green');

  return (
    <div className="demo-page">
      <h1>Radio</h1>

      <section>
        <h2>With labels</h2>
        <BsRadio name="color" value="red"   checked={color === 'red'}   onChange={e => e.detail.checked && setColor('red')}>Red</BsRadio>{' '}
        <BsRadio name="color" value="green" checked={color === 'green'} onChange={e => e.detail.checked && setColor('green')}>Green</BsRadio>{' '}
        <BsRadio name="color" value="blue"  checked={color === 'blue'}  onChange={e => e.detail.checked && setColor('blue')}>Blue</BsRadio>
      </section>

      <section>
        <h2>Toggle-button variant</h2>
        <BsRadio name="size" type="toggle_button" value="s" color="outline-primary">Small</BsRadio>{' '}
        <BsRadio name="size" type="toggle_button" value="m" color="outline-primary">Medium</BsRadio>{' '}
        <BsRadio name="size" type="toggle_button" value="l" color="outline-primary">Large</BsRadio>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
