import { BsPagination } from '@mintplayer/react-bootstrap/pagination';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = "<BsPagination />";

export function PaginationPage() {
  return (
    <div className="demo-page">
      <h1>Pagination</h1>
      <section>
        <h2>Default</h2>
        <BsPagination />
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
