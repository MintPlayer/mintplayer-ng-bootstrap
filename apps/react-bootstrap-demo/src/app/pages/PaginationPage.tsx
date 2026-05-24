import { useState } from 'react';
import { BsPagination } from '@mintplayer/react-bootstrap/pagination';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const PAGES_SMALL = [1, 2, 3, 4, 5];
const PAGES_LARGE = Array.from({ length: 30 }, (_, i) => i + 1);

const SOURCE = `import { useState } from 'react';
import { BsPagination } from '@mintplayer/react-bootstrap/pagination';

export function MyPagination() {
  const [page, setPage] = useState(1);
  const pages = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <BsPagination
      pageNumbers={pages}
      selectedPageNumber={page}
      numberOfBoxes={9}
      onMpPaginationPageChange={(e) => setPage(e.detail.page)}
    />
  );
}`;

export function PaginationPage() {
  const [smallPage, setSmallPage] = useState(1);
  const [bigPage, setBigPage] = useState(15);

  return (
    <div className="demo-page">
      <h1>Pagination</h1>
      <p className="text-body-secondary">
        Page selector with first/last anchors, ellipsis gaps, and prev/next
        arrows. The visible budget is capped by <code>numberOfBoxes</code>;
        pass any sorted <code>number[]</code> via <code>pageNumbers</code>.
      </p>

      <section>
        <h2>Small set</h2>
        <BsPagination
          pageNumbers={PAGES_SMALL}
          selectedPageNumber={smallPage}
          onMpPaginationPageChange={(e) => setSmallPage(e.detail.page)}
        />
        <small className="text-muted d-block mt-1">Selected: {smallPage}</small>
      </section>

      <section>
        <h2>Capped with ellipsis</h2>
        <BsPagination
          pageNumbers={PAGES_LARGE}
          selectedPageNumber={bigPage}
          numberOfBoxes={9}
          onMpPaginationPageChange={(e) => setBigPage(e.detail.page)}
        />
        <small className="text-muted d-block mt-1">Selected: {bigPage}</small>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
