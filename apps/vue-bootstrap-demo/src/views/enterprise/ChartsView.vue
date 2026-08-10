<script setup lang="ts">
import { ref } from 'vue';
import { BsHierarchyChart } from '@mintplayer/vue-bootstrap/charts/hierarchy';
import { BsTrendChart } from '@mintplayer/vue-bootstrap/charts/trend';
import { BsSparkline } from '@mintplayer/vue-bootstrap/charts/sparkline';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { HierarchyChartLayout, HierarchyNode } from '@mintplayer/web-components/charts/hierarchy';
import type { TrendSeries } from '@mintplayer/web-components/charts/trend';

const leaf = (id: string, name: string, value: number, coverage: number): HierarchyNode =>
  ({ id, name, value, colorValue: coverage });

const tree: HierarchyNode = {
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

const series: TrendSeries[] = [
  {
    id: 'coverage', label: 'Coverage',
    points: [62, 65, 64, null, 71, 74, 78, 82, 81, 85]
      .map((y, i) => ({ x: new Date(2026, 0, 1 + i * 7), y })),
  },
];

const layouts: HierarchyChartLayout[] = ['sunburst', 'icicle', 'treemap'];
const layout = ref<HierarchyChartLayout>('sunburst');
const rootId = ref<string | undefined>(undefined);
const sparkPoints = [78, 80, 79, 82, 83, 84];

const SOURCE = `<BsHierarchyChart
  :data="tree"
  :layout="layout"
  v-model:rootId="rootId"
  color-min="60"
  color-max="80"
  input-label="Coverage by folder"
  value-unit-label="lines"
/>

<BsTrendChart :series="series" y-min="0" y-max="100" goal="80"
  goal-label="Goal 80%" input-label="Coverage over time" />

<BsSparkline :points="sparkPoints" area y-min="0" y-max="100" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Charts</h1>
    <p class="text-body-secondary">
      Coverage-style visualizations: a hierarchy chart with three interchangeable layouts,
      a trend chart, and inline sparklines. Size encodes lines of code; color encodes the
      coverage metric over the 60–80% range.
    </p>

    <p>
      <button
        v-for="option of layouts"
        :key="option"
        type="button"
        class="btn me-2"
        :class="layout === option ? 'btn-primary' : 'btn-secondary'"
        @click="layout = option"
      >{{ option }}</button>
    </p>
    <div class="chart-box">
      <BsHierarchyChart
        :data="tree"
        :layout="layout"
        v-model:rootId="rootId"
        color-min="60"
        color-max="80"
        input-label="Coverage by folder"
        value-unit-label="lines"
      />
    </div>

    <h2 class="mt-4">Trend</h2>
    <div class="trend-box">
      <BsTrendChart
        :series="series"
        y-min="0"
        y-max="100"
        goal="80"
        goal-label="Goal 80%"
        input-label="Coverage over time"
        locale="en-US"
      />
    </div>

    <h2 class="mt-4">Sparkline</h2>
    <p>
      unit coverage <BsSparkline :points="sparkPoints" area y-min="0" y-max="100" /> 84%
    </p>

    <h2 class="mt-4">Source</h2>
    <BsCodeSnippet :code="SOURCE" language="html" />
  </div>
</template>

<style scoped>
.chart-box {
  max-width: 480px;
}

.trend-box {
  max-width: 720px;
}
</style>
