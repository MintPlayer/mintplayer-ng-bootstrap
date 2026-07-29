import { useState } from 'react';
import { BsRadio } from '@mintplayer/react-bootstrap/radio';
import { BsRadioGroup } from '@mintplayer/react-bootstrap/radio-group';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsRadioGroup name="color" aria-label="Color" value={color}
              onGroupChange={e => e.detail.value && setColor(e.detail.value)}>
  <BsRadio value="red">Red</BsRadio>
  <BsRadio value="green">Green</BsRadio>
</BsRadioGroup>`;

// <BsRadioGroup> (the mp-radio-group WC) owns what shadow roots keep the
// platform from providing: one-of-N exclusivity, role="radiogroup", the
// roving tab stop and arrow move-and-select. The consumer holds ONE value
// per group and listens for group-change — which also covers keyboard
// selection, where no per-radio change event ever fires. Same rule for
// BOTH the form-check variant AND the toggle_button variant, since
// they're both <mp-radio>s under the hood.
export function RadioPage() {
  const [color, setColor] = useState<string>('green');
  const [size, setSize] = useState<string>('m');

  return (
    <div className="demo-page">
      <h1>Radio</h1>

      <section>
        <h2>With labels</h2>
        <BsRadioGroup name="color" aria-label="Color" value={color}
                      onGroupChange={e => e.detail.value && setColor(e.detail.value)}>
          <BsRadio value="red">Red</BsRadio>{' '}
          <BsRadio value="green">Green</BsRadio>{' '}
          <BsRadio value="blue">Blue</BsRadio>
        </BsRadioGroup>
        <p>Selected: {color}</p>
      </section>

      <section>
        <h2>Toggle-button variant</h2>
        <BsRadioGroup name="size" aria-label="Size" value={size}
                      onGroupChange={e => e.detail.value && setSize(e.detail.value)}>
          <BsRadio type="toggle_button" value="s" color="outline-primary">Small</BsRadio>{' '}
          <BsRadio type="toggle_button" value="m" color="outline-primary">Medium</BsRadio>{' '}
          <BsRadio type="toggle_button" value="l" color="outline-primary">Large</BsRadio>
        </BsRadioGroup>
        <p>Selected: {size}</p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
