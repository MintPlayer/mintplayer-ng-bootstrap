import { BsMarquee } from '@mintplayer/react-bootstrap/marquee';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsMarquee } from '@mintplayer/react-bootstrap/marquee';

<BsMarquee label="Greeting">Hello world</BsMarquee>`;

export function MarqueePage() {
  return (
    <div className="demo-page">
      <h1>Marquee</h1>
      <p className="text-body-secondary">
        Scrolls its content horizontally. It pauses on hover, on focus and with its button (localise
        it with <code>pauseText</code> / <code>resumeText</code>), and stands still when the user
        prefers reduced motion. <code>label</code> names the ticker.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsMarquee label="Greeting">Hello world</BsMarquee>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
