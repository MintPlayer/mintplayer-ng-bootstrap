<script setup lang="ts">
// The trend chart's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectTrendChart().
import type { TrendChartView } from '@mintplayer/ui-core/charts/trend';

defineProps<{ view: TrendChartView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <svg v-bind="view.svg">
      <g v-bind="view.grid">
        <line v-for="tick in view.yTicks" :key="tick.key" v-bind="tick.line"></line>
      </g>
      <g v-bind="view.axis">
        <text v-for="tick in view.yTicks" :key="tick.key" v-bind="tick.label">{{ tick.text }}</text>
        <text v-for="tick in view.xTicks" :key="tick.key" v-bind="tick.label">{{ tick.text }}</text>
      </g>
      <g v-for="s in view.series" :key="s.key" v-bind="s.group">
        <path v-if="s.area" v-bind="s.area"></path>
        <path v-bind="s.line"></path>
      </g>
      <g v-if="view.goal" v-bind="view.goal.group">
        <line v-bind="view.goal.line"></line>
        <text v-if="view.goal.label" v-bind="view.goal.label">{{ view.goal.text }}</text>
      </g>
      <line v-if="view.crosshair" v-bind="view.crosshair"></line>
      <circle v-for="p in view.points" :key="p.key" v-bind="p.bag"></circle>
    </svg>
    <div v-bind="view.tooltip.bag" :style="view.tooltip.style">{{ view.tooltip.text }}</div>
    <div v-if="view.summary" v-bind="view.summary.bag">{{ view.summary.text }}</div>
  </div>
</template>
