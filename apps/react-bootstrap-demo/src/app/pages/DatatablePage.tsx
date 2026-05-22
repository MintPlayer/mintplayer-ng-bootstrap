import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = "<BsDatatable />";

export function DatatablePage() {
  return (
    <div className="demo-page">
      <h1>Datatable</h1>
      <section>
        <h2>Default</h2>
        <BsDatatable />
      <p className="small text-body-secondary mt-2">Set `columns` and `rows` properties on a ref.</p>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
