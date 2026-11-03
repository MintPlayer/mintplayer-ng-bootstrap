import { BsStickyFooter, useBsStickyFooterParent } from '@mintplayer/react-bootstrap/sticky-footer';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsStickyFooter, useBsStickyFooterParent } from '@mintplayer/react-bootstrap/sticky-footer';

const parent = useBsStickyFooterParent();
<div {...parent}>
  …content…
  <BsStickyFooter>© Copyright</BsStickyFooter>
</div>`;

export function StickyFooterPage() {
  const parent = useBsStickyFooterParent();
  return (
    <div {...parent}>
      <div className="demo-page">
        <h1>Sticky footer</h1>
        <p className="text-body-secondary">
          Pure CSS: <code>useBsStickyFooterParent</code> makes the element a flex column at least
          <code>--mp-sticky-footer-min-height</code> tall (default <code>100dvh</code>), and
          <code>BsStickyFooter</code> takes the free space above itself, so the footer sits at the
          bottom of the viewport while the content is short.
        </p>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </div>
      <BsStickyFooter>
        <div className="py-3 px-4 bg-body-tertiary border-top">© Copyright</div>
      </BsStickyFooter>
    </div>
  );
}
