import { BsBadge } from '@mintplayer/react-bootstrap/badge';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsBadge } from '@mintplayer/react-bootstrap/badge';

export function Inbox() {
  return (
    <h2>
      Inbox <BsBadge color="primary" unit="unread messages">5</BsBadge>
    </h2>
  );
}`;

const COLORS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'] as const;

export function BadgePage() {
  return (
    <div className="demo-page">
      <h1>Badge</h1>
      <p className="text-body-secondary">
        An inline Bootstrap badge for counters and status labels. <code>unit</code> says what a
        number counts, visually hidden; <code>decorative</code> takes a badge out of the
        accessibility tree.
      </p>

      <section>
        <h2>In a heading</h2>
        <h3>
          Inbox <BsBadge color="primary" unit="unread messages">5</BsBadge>
        </h3>
      </section>

      <section>
        <h2>Colours</h2>
        <p className="d-flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <BsBadge key={color} color={color}>{color}</BsBadge>
          ))}
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
