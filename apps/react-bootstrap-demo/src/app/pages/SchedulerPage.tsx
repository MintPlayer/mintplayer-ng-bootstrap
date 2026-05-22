import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler';

export function MyScheduler() {
  return (
    <BsScheduler
      view="week"
      // Resources, events, options are set via the WC's properties.
      // Use a ref to push complex objects (the React wrapper forwards
      // non-string props via the WC's setter, not attributes).
    />
  );
}`;

export function SchedulerPage() {
  return (
    <div className="demo-page">
      <h1>Scheduler</h1>
      <p className="text-body-secondary">
        Resource-grid scheduler with day / week / month views and drag-to-reschedule.
      </p>
      <section>
        <h2>Default week view</h2>
        <div style={{ height: '500px', border: '1px solid var(--bs-border-color)', borderRadius: '0.375rem' }}>
          <BsScheduler />
        </div>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
