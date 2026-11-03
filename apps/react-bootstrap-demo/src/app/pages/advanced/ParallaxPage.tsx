import { BsParallax } from '@mintplayer/react-bootstrap/parallax';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsParallax } from '@mintplayer/react-bootstrap/parallax';

<BsParallax image="/assets/resized/lion.png" height={300} />`;

const FILLER = Array.from({ length: 6 }, (_, i) => i);

export function ParallaxPage() {
  return (
    <div className="demo-page">
      <h1>Parallax</h1>
      <p className="text-body-secondary">
        A decorative band whose background <code>image</code> stays fixed while the page scrolls
        past it. Under reduced motion it scrolls along with the page.
      </p>

      <section>
        <h2>Basic usage</h2>
        {FILLER.map((i) => <p key={`a${i}`}>Scroll down to see the image stay in place.</p>)}
        <BsParallax image="/assets/resized/lion.png" height={300} />
        {FILLER.map((i) => <p key={`b${i}`}>Keep scrolling.</p>)}
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
