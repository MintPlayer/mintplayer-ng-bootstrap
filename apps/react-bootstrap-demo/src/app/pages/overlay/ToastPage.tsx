import { useEffect, useState, type FormEvent } from 'react';
import { ToastQueue, type ToastEntry } from '@mintplayer/ui-core/toast';
import { BsToast, BsToastBody, BsToaster, BsToastHeader } from '@mintplayer/react-bootstrap/toast';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

interface Message {
  message: string;
}

const SOURCE = `import { ToastQueue } from '@mintplayer/ui-core/toast';
import { BsToast, BsToastBody, BsToaster, BsToastHeader } from '@mintplayer/react-bootstrap/toast';

const toasts = new ToastQueue<{ message: string }>();   // one per app: toast from anywhere

<button type="button" className="btn btn-primary" onClick={() => toasts.push({ message: 'Saved!' })}>Show toast</button>

<BsToaster
  queue={toasts}
  toast={({ toast }) => (
    <BsToast visible={toast.visible} onVisibleChange={() => toasts.close(toast.id)}>
      <BsToastHeader><strong className="me-auto">Notification</strong></BsToastHeader>
      <BsToastBody>{toast.data.message}</BsToastBody>
    </BsToast>
  )}
/>`;

export function ToastPage() {
  const [toasts] = useState(() => new ToastQueue<Message>());
  const [text, setText] = useState('');
  useEffect(() => () => toasts.destroy(), [toasts]);

  const add = (event: FormEvent) => {
    event.preventDefault();
    toasts.push({ message: text || 'Hello, world!' });
    setText('');
  };

  return (
    <div className="demo-page">
      <h1>Toast</h1>
      <p className="text-body-secondary">
        A <code>ToastQueue</code> holds the toasts: <code>push(data)</code> queues one and <code>close(id)</code>{' '}
        dismisses it. <code>BsToaster</code> renders the queue in a fixed corner, calling <code>toast</code> once per
        entry. A toast announces its text when it shows, and hides itself after five seconds unless the pointer or
        focus is on the toasts.
      </p>

      <section>
        <h2>Basic usage</h2>
        <form className="input-group" onSubmit={add}>
          <input className="form-control" aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn btn-primary">
            Add notification
          </button>
        </form>
        <BsToaster
          queue={toasts}
          toast={({ toast }) => {
            const entry = toast as ToastEntry<Message>;
            return (
              <BsToast visible={entry.visible} onVisibleChange={() => toasts.close(entry.id)}>
                <BsToastHeader>
                  <strong className="me-auto">Bootstrap</strong>
                  <small className="text-body-secondary">just now</small>
                </BsToastHeader>
                <BsToastBody>{entry.data.message}</BsToastBody>
              </BsToast>
            );
          }}
        />
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
