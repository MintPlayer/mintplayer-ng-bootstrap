import { useState } from 'react';
import { BsSignaturePad, type Signature } from '@mintplayer/react-bootstrap/signature-pad';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsSignaturePad
  width={500}
  height={300}
  signature={signature}
  onSignatureChange={e => setSignature(e.detail)}
/>`;

export function SignaturePadPage() {
  const [signature, setSignature] = useState<Signature>({ strokes: [] });

  return (
    <div className="demo-page">
      <h1>Signature pad</h1>
      <p className="text-body-secondary">
        Freehand signature capture on a canvas. Drawing has no keyboard
        equivalent, so the pad ships a typed-signature alternative: the text
        input below the canvas renders its value in a script font and stores
        it on <code>Signature.text</code>. Undo and Clear are regular buttons
        in the tab order.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsSignaturePad
          {...{ width: 500, height: 300, signature } as React.ComponentProps<typeof BsSignaturePad>}
          onSignatureChange={(e: CustomEvent<Signature>) => setSignature(e.detail)}
        />
        <p className="text-body-secondary mt-2">
          Strokes: <code>{signature.strokes.length}</code>
          {signature.text ? <> · Typed: <code>{signature.text}</code></> : null}
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
