import { BsFileManager } from '@mintplayer/react-bootstrap/file-manager';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = "<BsFileManager style={{ height: '400px' }} />";

export function FileManagerPage() {
  return (
    <div className="demo-page">
      <h1>File manager</h1>
      <section>
        <h2>Default</h2>
        <BsFileManager style={{ height: '400px' }} />
      <p className="small text-body-secondary mt-2">Set the `files` property on a ref.</p>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
