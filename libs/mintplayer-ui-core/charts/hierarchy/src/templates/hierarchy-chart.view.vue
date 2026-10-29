<script setup lang="ts">
// The hierarchy chart's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectHierarchyChart().
import type { HierarchyChartView } from '@mintplayer/ui-core/charts/hierarchy';

defineProps<{ view: HierarchyChartView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <nav v-if="view.breadcrumb" v-bind="view.breadcrumb.nav">
      <template v-for="c in view.breadcrumb.items" :key="c.key">
        <span v-if="c.current" v-bind="c.current">{{ c.text }}</span>
        <button v-if="c.button" v-bind="c.button">{{ c.text }}</button>
        <span v-if="c.sep" v-bind="c.sep">/</span>
      </template>
    </nav>
    <div v-bind="view.chart" :style="view.chartStyle">
      <svg v-if="view.sunburst" v-bind="view.sunburst.svg">
        <g v-bind="view.sunburst.g">
          <path v-for="a in view.sunburst.arcs" :key="a.key" v-bind="a.bag"></path>
          <text v-for="l in view.sunburst.labels" :key="l.key" v-bind="l.bag">{{ l.text }}</text>
        </g>
      </svg>
      <button v-if="view.sunburst" v-bind="view.sunburst.center.bag" :style="view.sunburst.center.style">{{ view.sunburst.center.text }}</button>
      <div v-if="view.icicle" v-bind="view.icicle.tree">
        <div v-bind="view.icicle.focus.bag" :style="view.icicle.focus.style">
          <span v-if="view.icicle.focus.label !== null" v-bind="view.cellLabel">{{ view.icicle.focus.label }}</span>
        </div>
        <div v-for="c in view.icicle.cells" :key="c.key" v-bind="c.bag" :style="c.style">
          <span v-if="c.label !== null" v-bind="view.cellLabel">{{ c.label }}</span>
        </div>
      </div>
      <div v-if="view.treemap" v-bind="view.treemap.wrap">
        <button v-bind="view.treemap.header.bag">{{ view.treemap.header.text }}</button>
        <div v-bind="view.treemap.body">
          <div v-for="c in view.treemap.cells" :key="c.key" v-bind="c.bag" :style="c.style">
            <span v-if="c.label !== null" v-bind="view.cellLabel">{{ c.label }}</span>
          </div>
        </div>
      </div>
      <div v-bind="view.tooltip.bag" :style="view.tooltip.style">{{ view.tooltip.text }}</div>
      <div v-if="view.hint" v-bind="view.hint.bag">{{ view.hint.text }}</div>
      <div v-bind="view.live">{{ view.announcement }}</div>
    </div>
  </div>
</template>
