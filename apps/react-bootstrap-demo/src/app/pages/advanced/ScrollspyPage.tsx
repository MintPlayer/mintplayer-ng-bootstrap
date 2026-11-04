import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsScrollspy } from '@mintplayer/react-bootstrap/scrollspy';

const SOURCE = `import { BsScrollspy } from '@mintplayer/react-bootstrap/scrollspy';

<BsScrollspy>
  <h2 data-scrollspy>Section A</h2>
  <p>Content for section A…</p>

  <h2 data-scrollspy>Section B</h2>
  <p>Content for section B…</p>

  <h3 data-scrollspy>Subsection B1</h3>
  <p>Content for subsection B1…</p>
</BsScrollspy>`;

const SECTIONS = [
  { title: 'Getting started', level: 2 },
  { title: 'Installation', level: 3 },
  { title: 'Configuration', level: 3 },
  { title: 'Usage', level: 2 },
  { title: 'Sections', level: 3 },
  { title: 'Scroll containers', level: 3 },
  { title: 'Accessibility', level: 2 },
];

const PARAGRAPH =
  'The list beside this text follows the reader: the entry of the section whose heading last passed the top of the ' +
  'viewport is bold and marked as the current location. Click an entry to scroll its section into place.';

export function ScrollspyPage() {
  return (
    <div className="demo-page">
      <h1>Scrollspy</h1>
      <p className="text-body-secondary">
        <code>BsScrollspy</code> lists the content's elements marked <code>data-scrollspy</code> in a sticky column
        beside it and marks the section being read (<code>aria-current="location"</code>). It scrolls with the window
        or with its nearest scrolling ancestor (a scrollable modal body), or with <code>scrollContainer</code>;{' '}
        <code>offset</code> moves the trigger line below a fixed navbar. The list is built once the page is
        hydrated.
      </p>

      <BsScrollspy>
        {SECTIONS.map((section) =>
          section.level === 2 ? (
            <div key={section.title}>
              <h2 data-scrollspy="">{section.title}</h2>
              <p>{PARAGRAPH}</p>
              <p>{PARAGRAPH}</p>
            </div>
          ) : (
            <div key={section.title}>
              <h3 data-scrollspy="">{section.title}</h3>
              <p>{PARAGRAPH}</p>
              <p>{PARAGRAPH}</p>
              <p>{PARAGRAPH}</p>
            </div>
          ),
        )}
      </BsScrollspy>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
