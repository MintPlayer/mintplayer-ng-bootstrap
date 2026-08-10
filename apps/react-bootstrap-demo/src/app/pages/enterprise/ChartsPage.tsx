import { useState } from 'react';
import { BsHierarchyChart } from '@mintplayer/react-bootstrap/charts/hierarchy';
import { BsTrendChart } from '@mintplayer/react-bootstrap/charts/trend';
import { BsSparkline } from '@mintplayer/react-bootstrap/charts/sparkline';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type { HierarchyChartLayout, HierarchyNode } from '@mintplayer/web-components/charts/hierarchy';
import type { TrendSeries } from '@mintplayer/web-components/charts/trend';

const leaf = (id: string, name: string, value: number, coverage: number): HierarchyNode =>
  ({ id, name, value, colorValue: coverage });

const TREE: HierarchyNode = {
  id: 'repo', name: 'repo',
  children: [
    {
      id: 'src', name: 'src',
      children: [
        leaf('src/chart.ts', 'chart.ts', 1240, 82),
        leaf('src/table.ts', 'table.ts', 640, 71),
        leaf('src/modal.ts', 'modal.ts', 300, 55),
      ],
    },
    {
      id: 'libs', name: 'libs',
      children: [
        leaf('libs/core.ts', 'core.ts', 900, 64),
        leaf('libs/http.ts', 'http.ts', 500, 45),
      ],
    },
    leaf('README.md', 'README.md', 40, 100),
  ],
};

const SERIES: TrendSeries[] = [
  {
    id: 'coverage', label: 'Coverage',
    points: [62, 65, 64, null, 71, 74, 78, 82, 81, 85]
      .map((y, i) => ({ x: new Date(2026, 0, 1 + i * 7), y })),
  },
];

const SOURCE = `<BsHierarchyChart
  data={tree}
  layout={layout}
  root-id={rootId}
  color-min="60"
  color-max="80"
  input-label="Coverage by folder"
  value-unit-label="lines"
  onHierarchyZoom={e => setRootId(e.detail.node.id)}
/>

<BsTrendChart series={series} y-min="0" y-max="100" goal="80"
  goal-label="Goal 80%" input-label="Coverage over time" />

<BsSparkline points={[62, 65, 71, 74, 82]} area y-min="0" y-max="100" />`;

const LAYOUTS: HierarchyChartLayout[] = ['sunburst', 'icicle', 'treemap'];

export function ChartsPage() {
  const [layout, setLayout] = useState<HierarchyChartLayout>('sunburst');

  return (
    <div className="demo-page">
      <h1>Charts</h1>
      <p className="text-body-secondary">
        Coverage-style visualizations: a hierarchy chart with three interchangeable layouts,
        a trend chart, and inline sparklines. Size encodes lines of code; color encodes the
        coverage metric over the 60–80% range.
      </p>

      <p>
        {LAYOUTS.map((option) => (
          <button
            key={option}
            type="button"
            className={`btn me-2 ${layout === option ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setLayout(option)}
          >{option}</button>
        ))}
      </p>
      <div style={{ maxWidth: '480px' }}>
        <BsHierarchyChart
          data={TREE}
          layout={layout}
          color-min="60"
          color-max="80"
          input-label="Coverage by folder"
          value-unit-label="lines"
        />
      </div>

      <h2 className="mt-4">Trend</h2>
      <div style={{ maxWidth: '720px' }}>
        <BsTrendChart
          series={SERIES}
          y-min="0"
          y-max="100"
          goal="80"
          goal-label="Goal 80%"
          input-label="Coverage over time"
          locale="en-US"
        />
      </div>

      <h2 className="mt-4">Sparkline</h2>
      <p>
        unit coverage <BsSparkline points={[78, 80, 79, 82, 83, 84]} area y-min="0" y-max="100" /> 84%
      </p>

      <h2 className="mt-4">Source</h2>
      <BsCodeSnippet code={SOURCE} language="tsx" />
    </div>
  );
}
