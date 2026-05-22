import { BsTreeview } from '@mintplayer/react-bootstrap/treeview';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = "<BsTreeview />";

export function TreeviewPage() {
  return (
    <div className="demo-page">
      <h1>Treeview</h1>
      <section>
        <h2>Default</h2>
        <BsTreeview />
      <p className="small text-body-secondary mt-2">Set the `nodes` property on a ref for sample data.</p>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
