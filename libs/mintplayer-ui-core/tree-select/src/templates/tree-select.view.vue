<script setup lang="ts">
// The tree-select's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectTreeSelect(). The panel's
// tree is the treeview's markup repeated (a template cannot include another
// component); keep it in step with treeview.view.vue.
import type { TreeNode } from '@mintplayer/ui-core/tree';
import type { TreeSelectValue, TreeSelectView } from '@mintplayer/ui-core/tree-select';

defineProps<{ view: TreeSelectView }>();
defineSlots<{
  item?: (props: { node: TreeNode; query: string }) => unknown;
  suggestion?: (props: { node: TreeNode; query: string }) => unknown;
  button?: (props: { value: TreeSelectValue }) => unknown;
  header?: () => unknown;
  footer?: () => unknown;
  noResults?: () => unknown;
  enterSearchTerm?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.live">{{ view.announcement }}</div>
    <div v-if="view.textbox" v-bind="view.control">
      <span v-for="chip in view.chips" :key="chip.key" v-bind="chip.bag">
        <span v-bind="view.chipLabel"><slot name="item" :node="chip.node" :query="view.query">{{ chip.node.label }}</slot></span>
        <button v-if="chip.remove" v-bind="chip.remove">×</button>
      </span>
      <span v-if="view.single" v-bind="view.singleBag"><slot name="item" :node="view.single" :query="view.query">{{ view.single.label }}</slot></span>
      <input v-bind="view.input" :value.prop="view.query" />
      <button v-if="view.clear" v-bind="view.clear">×</button>
      <span v-bind="view.caret"></span>
    </div>
    <button v-else v-bind="view.button">
      <span v-bind="view.buttonBody">
        <slot name="button" :value="view.value">
          <span v-if="view.showPlaceholder" v-bind="view.placeholder">{{ view.placeholderText }}</span>
          <span v-for="chip in view.chips" :key="chip.key" v-bind="chip.bag">
            <span v-bind="view.chipLabel"><slot name="item" :node="chip.node" :query="view.query">{{ chip.node.label }}</slot></span>
          </span>
          <span v-if="view.single" v-bind="view.singleBag"><slot name="item" :node="view.single" :query="view.query">{{ view.single.label }}</slot></span>
        </slot>
      </span>
      <span v-bind="view.caret"></span>
    </button>
    <div v-bind="view.panel">
      <div v-if="$slots.header" v-bind="view.header"><slot name="header"></slot></div>
      <div v-if="view.panelSearch" v-bind="view.header"><input v-bind="view.panelSearch" :value.prop="view.query" /></div>
      <div v-bind="view.body" :style="view.bodyStyle">
        <div v-if="view.noProvider" v-bind="view.stateBag">{{ view.labels.noProvider }}</div>
        <div v-else-if="view.busy" v-bind="view.stateBag"><span v-bind="view.spinner"></span></div>
        <div v-else-if="view.noResults" v-bind="view.stateBag"><slot name="noResults">{{ view.labels.noResults }}</slot></div>
        <div v-else-if="view.noItems" v-bind="view.stateBag"><slot name="enterSearchTerm">{{ view.labels.noItems }}</slot></div>
        <ul v-if="view.showTree" v-bind="view.tree.tree">
          <li v-for="row in view.rows" :key="row.key" v-bind="row.item" :style="row.style">
            <span v-if="row.error" v-bind="row.errorBag">{{ row.error }}</span>
            <span v-bind="row.chevron"><span v-if="row.loading" v-bind="view.tree.spinner"></span></span>
            <span v-bind="view.tree.body">
              <span v-if="row.check" v-bind="row.check"></span>
              <span v-bind="view.tree.label"><slot name="suggestion" :node="row.node" :query="view.query">{{ row.node.label }}</slot></span>
            </span>
          </li>
        </ul>
      </div>
      <button v-if="view.loadMore" v-bind="view.loadMore">
        <span v-if="view.loadMoreBusy" v-bind="view.spinner"></span>
        <span v-else v-bind="view.loadMoreLabel">{{ view.labels.loadMore }}</span>
      </button>
      <div v-if="$slots.footer" v-bind="view.footer"><slot name="footer"></slot></div>
    </div>
  </div>
</template>
