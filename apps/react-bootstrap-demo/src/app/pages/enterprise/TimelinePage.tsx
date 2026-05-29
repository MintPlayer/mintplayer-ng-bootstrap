import { useState } from 'react';
import {
  BsTimeline,
  BsTimelineItem,
  type TimelineItem,
  type TimelineItemClickDetail,
} from '@mintplayer/react-bootstrap/timeline';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import './TimelinePage.css';

// Shared seed data — a list of project milestones reused across every section.
const MILESTONES: TimelineItem[] = [
  { id: 'kickoff', title: 'Kickoff',         description: 'Project scoping and team assembly.', time: '2026-01-10', icon: 'bi bi-flag',           color: '#6c757d' },
  { id: 'design',  title: 'Design approved', description: 'PRD signed off after design review.', time: '2026-02-02', icon: 'bi bi-pencil-square', color: '#0d6efd' },
  { id: 'beta',    title: 'Beta',            description: 'Closed beta with 50 testers.',        time: '2026-04-15', icon: 'bi bi-flask',         color: '#fd7e14' },
  { id: 'ship',    title: 'Shipped v1',      description: 'First public release.',               time: '2026-05-01', icon: 'bi bi-rocket-takeoff', color: '#198754' },
];

// ── Source snippets (shown after each live demo) ──────────────────────────────

const BASIC_SOURCE = `<BsTimeline items={milestones} />`;

const HORIZONTAL_SOURCE = `<BsTimeline items={milestones} orientation="horizontal" />`;

const ALTERNATE_SOURCE = `<BsTimeline items={milestones} align="alternate" />`;

const REVERSE_SOURCE = `const [reverse, setReverse] = useState(false);

<button className="btn btn-outline-primary btn-sm mb-3" onClick={() => setReverse(r => !r)}>
  {reverse ? 'Newest first' : 'Oldest first'}
</button>
<BsTimeline items={milestones} reverse={reverse} />`;

const MARKERS_SOURCE = `<BsTimeline
  items={milestones}
  renderMarker={(item) => (
    <span
      className="timeline-marker-dot d-inline-flex align-items-center justify-content-center rounded-circle text-white"
      data-color={item.color}
    >
      <i className={item.icon as string} />
    </span>
  )}
/>`;

const CARD_SOURCE = `// Render-prop content beside each bullet.
<BsTimeline
  items={milestones}
  align="alternate"
  renderContent={(item) => (
    <div className="card shadow-sm">
      <div className="card-body py-2 px-3">
        <h3 className="h6 card-title mb-1">{item.title}</h3>
        <p className="card-text small text-body-secondary mb-0">{item.description}</p>
      </div>
    </div>
  )}
  renderTimestamp={(item) => <small className="text-body-secondary">{item.time as string}</small>}
/>

// Same thing, authored declaratively with <BsTimelineItem> children.
<BsTimeline align="alternate">
  {milestones.map((m) => (
    <BsTimelineItem key={m.id} itemId={m.id} color={m.color}>
      <div slot="content" className="card shadow-sm">
        <div className="card-body py-2 px-3">
          <h3 className="h6 card-title mb-1">{m.title}</h3>
          <p className="card-text small text-body-secondary mb-0">{m.description}</p>
        </div>
      </div>
      <small slot="opposite" className="text-body-secondary">{m.time as string}</small>
    </BsTimelineItem>
  ))}
</BsTimeline>`;

const SELECTABLE_SOURCE = `const [selected, setSelected] = useState<TimelineItem[]>([]);

<BsTimeline
  items={milestones}
  selectable="multiple"
  selection={selected}
  onSelectionChange={setSelected}
/>
<ul>
  {selected.map((s) => <li key={s.id}>{s.title}</li>)}
</ul>`;

export function TimelinePage() {
  const [reverse, setReverse] = useState(false);
  const [selected, setSelected] = useState<TimelineItem[]>([]);

  return (
    <div className="demo-page">
      <h1>Timeline</h1>
      <p className="text-body-secondary">
        Vertical or horizontal sequence of events with a connecting line,
        markers, and per-item content. Bind an <code>items</code> array for the
        built-in row layout, or take over any region with a render-prop /
        declarative <code>&lt;BsTimelineItem&gt;</code> child. Selection is
        opt-in and two-way bound; clicks emit a typed
        <code> item-click</code> detail.
      </p>

      <section>
        <h2>Basic vertical</h2>
        <BsTimeline items={MILESTONES} />
        <BsCodeSnippet code={BASIC_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Horizontal</h2>
        <BsTimeline items={MILESTONES} orientation="horizontal" />
        <BsCodeSnippet code={HORIZONTAL_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Alternate alignment</h2>
        <BsTimeline items={MILESTONES} align="alternate" />
        <BsCodeSnippet code={ALTERNATE_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Reverse</h2>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm mb-3"
          onClick={() => setReverse((r) => !r)}
        >
          {reverse ? 'Newest first' : 'Oldest first'}
        </button>
        <BsTimeline items={MILESTONES} reverse={reverse} />
        <BsCodeSnippet code={REVERSE_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Custom markers + colors</h2>
        <BsTimeline
          items={MILESTONES}
          renderMarker={(item) => (
            <span
              className="timeline-marker-dot d-inline-flex align-items-center justify-content-center rounded-circle text-white"
              data-color={item.color as string}
            >
              <i className={item.icon as string} />
            </span>
          )}
        />
        <BsCodeSnippet code={MARKERS_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Connected card (headline)</h2>
        <BsTimeline
          items={MILESTONES}
          align="alternate"
          renderContent={(item) => (
            <div className="card shadow-sm">
              <div className="card-body py-2 px-3">
                <h3 className="h6 card-title mb-1">{item.title}</h3>
                <p className="card-text small text-body-secondary mb-0">{item.description}</p>
              </div>
            </div>
          )}
          renderTimestamp={(item) => (
            <small className="text-body-secondary">{item.time as string}</small>
          )}
        />

        <h3 className="h6 mt-4 mb-2 text-body-secondary">Declarative authoring</h3>
        <BsTimeline align="alternate">
          {MILESTONES.map((m) => (
            <BsTimelineItem key={m.id} itemId={m.id} color={m.color}>
              <div slot="content" className="card shadow-sm">
                <div className="card-body py-2 px-3">
                  <h3 className="h6 card-title mb-1">{m.title}</h3>
                  <p className="card-text small text-body-secondary mb-0">{m.description}</p>
                </div>
              </div>
              <small slot="opposite" className="text-body-secondary">{m.time as string}</small>
            </BsTimelineItem>
          ))}
        </BsTimeline>

        <BsCodeSnippet code={CARD_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Selectable</h2>
        <p className="text-body-secondary">
          Click rows to toggle their selection (Ctrl/Shift for ranges). The
          selected milestones are mirrored below via two-way binding.
        </p>
        <BsTimeline
          items={MILESTONES}
          selectable="multiple"
          selection={selected}
          onSelectionChange={setSelected}
          onItemClick={(detail: TimelineItemClickDetail) =>
            console.log('clicked', detail.item.title)
          }
        />
        <div className="mt-3">
          <strong className="small text-body-secondary">Selected:</strong>{' '}
          {selected.length === 0 ? (
            <span className="text-body-secondary small">none</span>
          ) : (
            <ul className="mb-0">
              {selected.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ul>
          )}
        </div>
        <BsCodeSnippet code={SELECTABLE_SOURCE} language="tsx" />
      </section>
    </div>
  );
}
