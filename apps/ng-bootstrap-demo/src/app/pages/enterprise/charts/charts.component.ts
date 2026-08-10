import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsHierarchyChartComponent, type HierarchyChartLayout, type HierarchyNode } from '@mintplayer/ng-bootstrap/charts/hierarchy';
import { BsTrendChartComponent, type TrendSeries } from '@mintplayer/ng-bootstrap/charts/trend';
import { BsSparklineComponent } from '@mintplayer/ng-bootstrap/charts/sparkline';
import { BsTreeviewComponent, type TreeNode } from '@mintplayer/ng-bootstrap/treeview';
import { dedent } from 'ts-dedent';

const leaf = (id: string, name: string, value: number, coverage: number): HierarchyNode =>
  ({ id, name, value, colorValue: coverage });

@Component({
  selector: 'demo-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss'],
  imports: [
    BsButtonTypeDirective,
    BsCodeSnippetComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsHierarchyChartComponent,
    BsTrendChartComponent,
    BsSparklineComponent,
    BsTreeviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsComponent {
  readonly Color = Color;
  readonly layouts: HierarchyChartLayout[] = ['sunburst', 'icicle', 'treemap'];
  readonly layout = signal<HierarchyChartLayout>('sunburst');
  readonly rootId = signal<string | undefined>(undefined);
  /**
   * The element defaults to 2 (codecov's window, small DOM on a big tree); the
   * demo opts into 'auto' so the whole sample tree is visible without clicking
   * in, and the switcher shows what the capped modes look like.
   */
  readonly maxDepth = signal<number | 'auto'>('auto');
  readonly depthColors = computed<Record<string, Color>>(() => ({
    '2': this.maxDepth() === 2 ? Color.primary : Color.secondary,
    '3': this.maxDepth() === 3 ? Color.primary : Color.secondary,
    auto: this.maxDepth() === 'auto' ? Color.primary : Color.secondary,
  }));
  readonly depthOptions: (number | 'auto')[] = ['auto', 2, 3];
  readonly layoutColors = computed<Record<HierarchyChartLayout, Color>>(() => ({
    sunburst: this.layout() === 'sunburst' ? Color.primary : Color.secondary,
    icicle: this.layout() === 'icicle' ? Color.primary : Color.secondary,
    treemap: this.layout() === 'treemap' ? Color.primary : Color.secondary,
  }));

  readonly coverageTree: HierarchyNode = {
    id: 'repo', name: 'repo',
    children: [
      {
        id: 'src', name: 'src',
        children: [
          {
            id: 'src/components', name: 'components',
            children: [
              leaf('src/components/chart.ts', 'chart.ts', 1240, 82),
              leaf('src/components/table.ts', 'table.ts', 640, 71),
              leaf('src/components/modal.ts', 'modal.ts', 300, 55),
            ],
          },
          {
            id: 'src/utils', name: 'utils',
            children: [
              leaf('src/utils/math.ts', 'math.ts', 400, 95),
              leaf('src/utils/dates.ts', 'dates.ts', 250, 30),
            ],
          },
          leaf('src/main.ts', 'main.ts', 120, 100),
        ],
      },
      {
        id: 'libs', name: 'libs',
        children: [
          leaf('libs/core.ts', 'core.ts', 900, 64),
          leaf('libs/http.ts', 'http.ts', 500, 45),
          leaf('libs/auth.ts', 'auth.ts', 350, 88),
        ],
      },
      { id: 'tools', name: 'tools', children: [leaf('tools/build.mjs', 'build.mjs', 280, 0)] },
      leaf('README.md', 'README.md', 40, 100),
    ],
  };

  /**
   * WCAG 2.2 SC 2.5.8 equivalent control: the same tree, as a treeview whose
   * rows are unconstrained 24px+ targets. Selecting a folder re-roots the
   * chart; the chart's zoom keeps the treeview selection in sync.
   */
  readonly treeItems = computed<TreeNode[]>(() => {
    const map = (node: HierarchyNode): TreeNode => ({
      id: node.id,
      label: node.name,
      children: node.children?.map(map),
    });
    return this.coverageTree.children?.map(map) ?? [];
  });
  readonly selectedIds = computed<string[]>(() => (this.rootId() ? [this.rootId() as string] : []));

  onTreeSelect(detail: { node: TreeNode }): void {
    const findNode = (nodes: HierarchyNode[] | undefined, id: string): HierarchyNode | undefined =>
      nodes?.reduce<HierarchyNode | undefined>(
        (hit, n) => hit ?? (n.id === id ? n : findNode(n.children, id)),
        undefined,
      );
    const node = findNode(this.coverageTree.children, detail.node.id);
    this.rootId.set(node?.children?.length ? node.id : this.rootId());
  }

  readonly trendSeries: TrendSeries[] = [
    {
      id: 'coverage', label: 'Coverage',
      points: [62, 65, 64, null, 71, 74, 78, 82, 81, 85]
        .map((y, i) => ({ x: new Date(2026, 0, 1 + i * 7), y })),
    },
    {
      id: 'new-code', label: 'New code', color: '#6f42c1',
      points: [80, 82, 85, 84, 88, 90, 87, 91, 93, 95]
        .map((y, i) => ({ x: new Date(2026, 0, 1 + i * 7), y })),
    },
  ];

  readonly flagRows = [
    { flag: 'unit', coverage: 84, trend: [78, 80, 79, 82, 83, 84] },
    { flag: 'integration', coverage: 66, trend: [70, 69, 65, 64, 66, 66] },
    { flag: 'e2e', coverage: 41, trend: [30, 34, 33, null, 39, 41] },
  ];

  protected readonly snippetHierarchyHtml = dedent`
    <bs-hierarchy-chart
      [data]="coverageTree"
      [layout]="layout()"
      [(rootId)]="rootId"
      [maxDepth]="maxDepth()"
      [colorMin]="60"
      [colorMax]="80"
      inputLabel="Coverage by folder"
      valueUnitLabel="lines"
      (nodeSelect)="openFile($event.node)" />
  `;
  protected readonly snippetHierarchyTs = dedent`
    readonly layout = signal<HierarchyChartLayout>('sunburst');
    readonly rootId = signal<string | undefined>(undefined);
    // The element caps at 2 levels by default; 'auto' draws every loaded level.
    readonly maxDepth = signal<number | 'auto'>('auto');
    readonly coverageTree: HierarchyNode = {
      id: 'repo', name: 'repo',
      children: [
        { id: 'src', name: 'src', children: [
          { id: 'src/main.ts', name: 'main.ts', value: 120, colorValue: 100 },
        ]},
      ],
    };
  `;
  protected readonly snippetTrendHtml = dedent`
    <bs-trend-chart
      [series]="trendSeries"
      [yMin]="0" [yMax]="100"
      [goal]="80" goalLabel="Goal 80%"
      inputLabel="Coverage over time"
      summary="Coverage rose from 62% to 85% between January and March." />
  `;
  protected readonly snippetSparklineHtml = dedent`
    <bs-sparkline [points]="row.trend" [area]="true" [yMin]="0" [yMax]="100" />
  `;
}
