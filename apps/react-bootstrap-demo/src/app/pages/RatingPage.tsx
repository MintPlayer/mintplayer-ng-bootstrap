import { useState } from 'react';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsRating } from '@mintplayer/react-bootstrap/rating';

const SOURCE = `import { BsRating } from '@mintplayer/react-bootstrap/rating';

const [value, setValue] = useState(3);
<BsRating maximum={10} value={value} onValueChange={setValue} onPreviewChange={setPreview} />`;

export function RatingPage() {
  const [value, setValue] = useState(3);
  const [preview, setPreview] = useState<number | null>(null);
  return (
    <div className="demo-page">
      <h1>Rating</h1>
      <p className="text-body-secondary">
        A star rating as native radios in a radiogroup: <code>value</code> (0 for none) out of{' '}
        <code>maximum</code>. Arrow keys move between the stars, the value submits with a form under{' '}
        <code>name</code>, and it works without JavaScript. <code>onPreviewChange</code> reports the star under
        the pointer (null when it leaves); <code>label</code> and <code>starLabel</code> localise the names.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsRating maximum={10} value={value} onValueChange={setValue} onPreviewChange={setPreview} />
        <p className="mt-2">
          Value: <code>{value}</code>, showing: <code>{preview ?? value}</code>
        </p>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
