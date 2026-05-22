import { BsTileManager } from '@mintplayer/react-bootstrap/tile-manager';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = "<BsTileManager style={{ height: '400px' }} />";

export function TileManagerPage() {
  return (
    <div className="demo-page">
      <h1>Tile manager</h1>
      <section>
        <h2>Default</h2>
        <BsTileManager style={{ height: '400px' }} />
      <p className="small text-body-secondary mt-2">Set the `tiles` property on a ref for sample data.</p>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
