import { BsQueryBuilder } from '@mintplayer/react-bootstrap/query-builder';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = "<BsQueryBuilder />";

export function QueryBuilderPage() {
  return (
    <div className="demo-page">
      <h1>Query builder</h1>
      <section>
        <h2>Default</h2>
        <BsQueryBuilder />
      <p className="small text-body-secondary mt-2">Set the `schema` property on a ref to enable field selection.</p>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
