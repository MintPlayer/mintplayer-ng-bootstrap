import { BsRibbon, BsRibbonTab, BsRibbonGroup, BsRibbonButton } from '@mintplayer/react-bootstrap/ribbon';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = `import { BsRibbon, BsRibbonTab, BsRibbonGroup, BsRibbonButton } from '@mintplayer/react-bootstrap/ribbon';

export function MyRibbon() {
  return (
    <BsRibbon>
      <BsRibbonTab label="Home">
        <BsRibbonGroup label="Clipboard">
          <BsRibbonButton label="Paste" />
          <BsRibbonButton label="Cut" />
          <BsRibbonButton label="Copy" />
        </BsRibbonGroup>
      </BsRibbonTab>
    </BsRibbon>
  );
}`;

export function RibbonPage() {
  return (
    <div className="demo-page">
      <h1>Ribbon</h1>
      <p className="text-body-secondary">
        Microsoft Office-style command bar with priority-based reduce steps.
      </p>
      <section>
        <h2>Basic ribbon</h2>
        <BsRibbon>
          <BsRibbonTab label="Home">
            <BsRibbonGroup label="Clipboard">
              <BsRibbonButton label="Paste" />
              <BsRibbonButton label="Cut" />
              <BsRibbonButton label="Copy" />
            </BsRibbonGroup>
          </BsRibbonTab>
          <BsRibbonTab label="Insert">
            <BsRibbonGroup label="Tables">
              <BsRibbonButton label="Table" />
            </BsRibbonGroup>
          </BsRibbonTab>
        </BsRibbon>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
