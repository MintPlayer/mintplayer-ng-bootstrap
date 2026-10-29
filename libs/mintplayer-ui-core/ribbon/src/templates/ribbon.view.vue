<script setup lang="ts">
// The ribbon's markup (PRD #437 D10). `view` comes from connectRibbon(). The tab strip is built
// from the `tabs` content query, so it renders on the server; the tabs themselves render their
// panels in the content area. KeyTip badges sit at fixed positions the core measured.
import type { RibbonView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonView }>();
defineSlots<{ default?: () => unknown; tellMe?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.parts.container">
      <div v-bind="view.parts.tabstrip">
        <div v-bind="view.tablist">
          <template v-for="run in view.runs" :key="run.key">
            <div v-if="run.contextual" v-bind="run.band" :style="run.bandStyle">
              <div v-bind="view.parts.bandLabel">{{ run.label }}</div>
              <div v-bind="view.parts.bandTabs">
                <button v-for="tab in run.tabs" :key="tab.key" v-bind="tab.bag">{{ tab.label }}</button>
              </div>
            </div>
            <template v-else>
              <button v-for="tab in run.tabs" :key="tab.key" v-bind="tab.bag">{{ tab.label }}</button>
            </template>
          </template>
        </div>
        <div v-bind="view.parts.tellMe"><slot name="tellMe"></slot></div>
      </div>
      <div v-bind="view.content"><slot></slot></div>
    </div>
    <span v-for="tip in view.keyTips" :key="tip.key" v-bind="view.parts.keyTip" :style="tip.style">{{ tip.tip }}</span>
    <div v-bind="view.live">{{ view.announcement }}</div>
  </div>
</template>
