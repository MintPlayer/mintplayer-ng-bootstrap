import { Link } from 'react-router-dom';
import { BsBreadcrumb, BsBreadcrumbItem } from '@mintplayer/react-bootstrap/breadcrumb';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { Link } from 'react-router-dom';
import { BsBreadcrumb, BsBreadcrumbItem } from '@mintplayer/react-bootstrap/breadcrumb';

<BsBreadcrumb>
  <BsBreadcrumbItem><Link to="/">Home</Link></BsBreadcrumbItem>
  <BsBreadcrumbItem><Link to="/basic/badge">Basic</Link></BsBreadcrumbItem>
  <BsBreadcrumbItem active>Breadcrumb</BsBreadcrumbItem>
</BsBreadcrumb>`;

export function BreadcrumbPage() {
  return (
    <div className="demo-page">
      <h1>Breadcrumb</h1>
      <p className="text-body-secondary">
        A <code>&lt;nav&gt;</code> landmark (named by <code>label</code>) around an ordered list. The
        <code> active</code> item is the current page (<code>aria-current="page"</code>).
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsBreadcrumb>
          <BsBreadcrumbItem><Link to="/">Home</Link></BsBreadcrumbItem>
          <BsBreadcrumbItem><Link to="/basic/badge">Basic</Link></BsBreadcrumbItem>
          <BsBreadcrumbItem active>Breadcrumb</BsBreadcrumbItem>
        </BsBreadcrumb>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
