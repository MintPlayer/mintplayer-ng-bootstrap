import { useMemo, useState } from 'react';
import {
  BsTimeline,
  BsTimelineItem,
  type TimelineAlign,
  type TimelineItem,
  type TimelineItemClickDetail,
  type TimelineOrientation,
  type TimelineSelectable,
} from '@mintplayer/react-bootstrap/timeline';
import { BsCheckbox } from '@mintplayer/react-bootstrap/checkbox';
import { BsSelect } from '@mintplayer/react-bootstrap/select';
import { BsCard, BsCardHeader, BsCardBody, BsCardText, BsCardFooter } from '@mintplayer/react-bootstrap/card';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import './TimelinePage.css';

// Shared seed data — a list of project milestones.
const MILESTONES: TimelineItem[] = [
  { id: 'kickoff', title: 'Kickoff',         description: 'Project scoping and team assembly.', time: '2026-01-10', icon: 'bi bi-flag',           color: '#6c757d' },
  { id: 'design',  title: 'Design approved', description: 'PRD signed off after design review.', time: '2026-02-02', icon: 'bi bi-pencil-square', color: '#0d6efd' },
  { id: 'beta',    title: 'Beta',            description: 'Closed beta with 50 testers.',        time: '2026-04-15', icon: 'bi bi-flask',         color: '#fd7e14' },
  { id: 'ship',    title: 'Shipped v1',      description: 'First public release.',               time: '2026-05-01', icon: 'bi bi-rocket-takeoff', color: '#198754' },
];

// <bs-select> takes a JS `options` array of { value, label }.
const ORIENTATION_OPTIONS = (['vertical', 'horizontal'] as const).map((v) => ({ value: v, label: v }));
const ALIGN_OPTIONS = (['start', 'end', 'alternate', 'alternate-reverse'] as const).map((v) => ({ value: v, label: v }));
const SELECTABLE_OPTIONS = (['none', 'single', 'multiple'] as const).map((v) => ({ value: v, label: v }));

const RENDER_MARKER_SOURCE = `  renderMarker={(item) => (
    <span
      className="timeline-marker-dot d-inline-flex align-items-center justify-content-center rounded-circle text-white"
      data-color={item.color as string}
    >
      <i className={item.icon as string} />
    </span>
  )}`;

const RENDER_CONTENT_SOURCE = `  renderContent={(item) => (
    <BsCard className="shadow-sm">
      <BsCardHeader className="py-2 px-3 h6 mb-0">{item.title}</BsCardHeader>
      <BsCardBody className="py-2 px-3">
        <BsCardText className="small text-body-secondary mb-0">{item.description}</BsCardText>
      </BsCardBody>
      <BsCardFooter className="py-1 px-3 small text-body-secondary">{item.time}</BsCardFooter>
    </BsCard>
  )}`;

const DECLARATIVE_SOURCE = `<BsTimeline align="alternate">
  {milestones.map((m) => (
    <BsTimelineItem key={m.id} itemId={m.id} color={m.color}>
      <BsCard slot="content" className="shadow-sm">
        <BsCardHeader className="py-2 px-3 h6 mb-0">{m.title}</BsCardHeader>
        <BsCardBody className="py-2 px-3">
          <BsCardText className="small text-body-secondary mb-0">{m.description}</BsCardText>
        </BsCardBody>
        <BsCardFooter className="py-1 px-3 small text-body-secondary">{m.time as string}</BsCardFooter>
      </BsCard>
      <small slot="opposite" className="text-body-secondary">{m.time as string}</small>
    </BsTimelineItem>
  ))}
</BsTimeline>`;

export function TimelinePage() {
  const [orientation, setOrientation] = useState<TimelineOrientation>('vertical');
  const [align, setAlign] = useState<TimelineAlign>('start');
  const [selectable, setSelectable] = useState<TimelineSelectable>('none');
  const [reverse, setReverse] = useState(false);
  const [customMarkers, setCustomMarkers] = useState(false);
  const [cardContent, setCardContent] = useState(false);
  const [selected, setSelected] = useState<TimelineItem[]>([]);

  // Keep the copyable snippet in sync with the live controls.
  const playgroundSource = useMemo(() => {
    const lines = ['  items={milestones}'];
    if (orientation !== 'vertical') lines.push(`  orientation="${orientation}"`);
    if (align !== 'start') lines.push(`  align="${align}"`);
    if (reverse) lines.push('  reverse');
    if (selectable !== 'none') {
      lines.push(`  selectable="${selectable}"`);
      lines.push('  selection={selected}');
      lines.push('  onSelectionChange={setSelected}');
    }
    if (customMarkers) lines.push(RENDER_MARKER_SOURCE);
    if (cardContent) lines.push(RENDER_CONTENT_SOURCE);
    return `<BsTimeline\n${lines.join('\n')}\n/>`;
  }, [orientation, align, reverse, selectable, customMarkers, cardContent]);

  const renderMarker = customMarkers
    ? (item: TimelineItem) => (
        <span
          className="timeline-marker-dot d-inline-flex align-items-center justify-content-center rounded-circle text-white"
          data-color={item.color as string}
        >
          <i className={item.icon as string} />
        </span>
      )
    : undefined;

  const renderContent = cardContent
    ? (item: TimelineItem) => (
        <BsCard className="shadow-sm">
          <BsCardHeader className="py-2 px-3 h6 mb-0">{item.title}</BsCardHeader>
          <BsCardBody className="py-2 px-3">
            <BsCardText className="small text-body-secondary mb-0">{item.description}</BsCardText>
          </BsCardBody>
          <BsCardFooter className="py-1 px-3 small text-body-secondary">{item.time as string}</BsCardFooter>
        </BsCard>
      )
    : undefined;

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
        <h2>Playground</h2>
        <p className="text-body-secondary">
          Toggle each input with a <code>&lt;BsSelect&gt;</code> or{' '}
          <code>&lt;BsCheckbox&gt;</code> and watch the single live timeline —
          and the copyable snippet beneath it — update to match.
        </p>

        <div className="playground-controls">
          <div className="control-field">
            <label className="form-label mb-1">Orientation</label>
            <BsSelect
              value={orientation}
              options={ORIENTATION_OPTIONS}
              onValueChange={(e) => setOrientation(e.detail.value as TimelineOrientation)}
            />
          </div>

          <div className="control-field">
            <label className="form-label mb-1">Alignment</label>
            <BsSelect
              value={align}
              options={ALIGN_OPTIONS}
              onValueChange={(e) => setAlign(e.detail.value as TimelineAlign)}
            />
          </div>

          <div className="control-field">
            <label className="form-label mb-1">Selectable</label>
            <BsSelect
              value={selectable}
              options={SELECTABLE_OPTIONS}
              onValueChange={(e) => setSelectable(e.detail.value as TimelineSelectable)}
            />
          </div>

          <div className="control-toggles">
            <BsCheckbox type="switch" checked={reverse} onChange={(e) => setReverse(e.detail.checked)}>
              Reverse
            </BsCheckbox>
            <BsCheckbox type="switch" checked={customMarkers} onChange={(e) => setCustomMarkers(e.detail.checked)}>
              Custom markers
            </BsCheckbox>
            <BsCheckbox type="switch" checked={cardContent} onChange={(e) => setCardContent(e.detail.checked)}>
              Card content
            </BsCheckbox>
          </div>
        </div>

        <BsTimeline
          items={MILESTONES}
          orientation={orientation}
          align={align}
          reverse={reverse}
          selectable={selectable}
          selection={selected}
          onSelectionChange={setSelected}
          onItemClick={(detail: TimelineItemClickDetail) => console.log('clicked', detail.item.title)}
          renderMarker={renderMarker}
          renderContent={renderContent}
        />

        {selectable !== 'none' && (
          <div className="mt-3">
            <strong className="small text-body-secondary">Selected:</strong>{' '}
            {selected.length === 0 ? (
              <span className="text-body-secondary small">none</span>
            ) : (
              <span>{selected.map((s) => s.title).join(', ')}</span>
            )}
          </div>
        )}

        <BsCodeSnippet code={playgroundSource} language="tsx" />
      </section>

      <section>
        <h2>Declarative authoring</h2>
        <p className="text-body-secondary">
          Instead of binding <code>items</code>, render{' '}
          <code>&lt;BsTimelineItem&gt;</code> children and project into the named
          slots. Handy when each item's markup is bespoke rather than uniform.
        </p>
        <BsTimeline align="alternate">
          {MILESTONES.map((m) => (
            <BsTimelineItem key={m.id} itemId={m.id} color={m.color}>
              <BsCard slot="content" className="shadow-sm">
                <BsCardHeader className="py-2 px-3 h6 mb-0">{m.title}</BsCardHeader>
                <BsCardBody className="py-2 px-3">
                  <BsCardText className="small text-body-secondary mb-0">{m.description}</BsCardText>
                </BsCardBody>
                <BsCardFooter className="py-1 px-3 small text-body-secondary">{m.time as string}</BsCardFooter>
              </BsCard>
              <small slot="opposite" className="text-body-secondary">{m.time as string}</small>
            </BsTimelineItem>
          ))}
        </BsTimeline>
        <BsCodeSnippet code={DECLARATIVE_SOURCE} language="tsx" />
      </section>
    </div>
  );
}
