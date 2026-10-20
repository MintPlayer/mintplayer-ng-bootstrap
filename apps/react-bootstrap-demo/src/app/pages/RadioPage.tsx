import { useState } from 'react';
import { BsRadio } from '@mintplayer/react-bootstrap/radio';
import { BsRadioGroup } from '@mintplayer/react-bootstrap/radio-group';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsRadioGroup name="color" aria-label="Color" value={color}
              onValueChange={setColor}>
  <BsRadio value="red">Red</BsRadio>
  <BsRadio value="green">Green</BsRadio>
</BsRadioGroup>`;

// <BsRadioGroup> renders a div with role="radiogroup" and hands its
// <BsRadio>s one name. They are then native radios of one set, so the
// browser supplies exclusivity, the single tab stop and arrow
// move-and-select, with JavaScript off as well. The consumer holds ONE
// value per group; onValueChange fires for pointer and keyboard picks
// alike, for the form-check and toggle_button variants both.
export function RadioPage() {
  const [color, setColor] = useState<string>('green');
  const [size, setSize] = useState<string>('m');

  return (
    <div className="demo-page">
      <h1>Radio</h1>

      <section>
        <h2>With labels</h2>
        <BsRadioGroup name="color" aria-label="Color" value={color}
                      onValueChange={setColor}>
          <BsRadio value="red">Red</BsRadio>{' '}
          <BsRadio value="green">Green</BsRadio>{' '}
          <BsRadio value="blue">Blue</BsRadio>
        </BsRadioGroup>
        <p>Selected: {color}</p>
      </section>

      <section>
        <h2>Toggle-button variant</h2>
        <BsRadioGroup name="size" aria-label="Size" value={size}
                      onValueChange={setSize}>
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
