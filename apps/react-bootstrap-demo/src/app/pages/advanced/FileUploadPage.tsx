import { useEffect, useRef, useState } from 'react';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsFileUpload, type FileUpload } from '@mintplayer/react-bootstrap/file-upload';

const SOURCE = `import { BsFileUpload, type FileUpload } from '@mintplayer/react-bootstrap/file-upload';

const [files, setFiles] = useState<FileUpload[]>([]);
<BsFileUpload files={files} onFilesChange={setFiles} onFilesDropped={upload} />`;

const CUSTOM_SOURCE = `<BsFileUpload files={files} onFilesChange={setFiles} onFilesDropped={upload}
  fileTemplate={({ upload }) => (
    <div className="d-flex gap-2">
      <span className="flex-grow-1">{upload.file.name}</span>
      <button type="button" onClick={() => remove(upload)}>Remove</button>
    </div>
  )}
/>`;

/** Simulates an upload: a tenth of each new file every half second. */
function useFakeUpload() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setInterval>>());
  useEffect(() => () => [...timers.current].forEach((timer) => clearInterval(timer)), []);
  const upload = (added: FileUpload[]) => {
    const indices = new Set(added.map((u) => u.index));
    let steps = 0;
    const timer = setInterval(() => {
      setFiles((list) => list.map((u) => indices.has(u.index)
        ? { ...u, progress: Math.min(u.file.size, u.progress + Math.max(1, u.file.size / 10)) }
        : u));
      if (++steps >= 10) {
        clearInterval(timer);
        timers.current.delete(timer);
      }
    }, 500);
    timers.current.add(timer);
  };
  const remove = (upload: FileUpload) => setFiles((list) => list.filter((u) => u !== upload));
  return { files, setFiles, upload, remove };
}

export function FileUploadPage() {
  const basic = useFakeUpload();
  const custom = useFakeUpload();
  return (
    <div className="demo-page">
      <h1>File upload</h1>
      <p className="text-body-secondary">
        <code>BsFileUpload</code> is a drop zone over a native file input: drop files on it, click it or use the browse
        button. Each batch is added to <code>files</code>, reported through <code>onFilesDropped</code> and announced
        to screen readers. Rows show the name, size and a progress bar you update; <code>fileTemplate</code> replaces
        a row. With <code>name</code> the input submits its files with a form, no JavaScript needed.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsFileUpload files={basic.files} onFilesChange={basic.setFiles} onFilesDropped={basic.upload} />
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Custom rows</h2>
        <BsFileUpload
          files={custom.files}
          onFilesChange={custom.setFiles}
          onFilesDropped={custom.upload}
          fileTemplate={({ upload }) => (
            <div className="d-flex align-items-center gap-2">
              <span className="flex-grow-1 text-truncate">{upload.file.name}</span>
              <span className="text-body-secondary">{upload.progress >= upload.file.size ? 'Done' : 'Uploading…'}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => custom.remove(upload)}>
                Remove
              </button>
            </div>
          )}
        />
        <BsCodeSnippet code={CUSTOM_SOURCE} language="tsx" />
      </section>
    </div>
  );
}
