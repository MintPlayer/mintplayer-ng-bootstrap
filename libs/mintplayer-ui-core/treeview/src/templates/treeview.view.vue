<script setup lang="ts">
// The treeview's markup, compiled into the Angular, React, Vue and Lit fronts
// (PRD #437 D10). `view` comes from connectTreeview(): the rows are flat, each
// treeitem carrying its level, so no front needs a recursive template.
import type { TreeNode } from '@mintplayer/ui-core/tree';
import type { TreeNodeRenderContext, TreeviewView } from '@mintplayer/ui-core/treeview';

defineProps<{ view: TreeviewView }>();
defineSlots<{
  /** A node's body; the default is its icon and label. The chevron stays. */
  node?: (args: { node: TreeNode; ctx: TreeNodeRenderContext }) => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <ul mp-attrs v-bind="view.tree">
      <li v-for="row in view.rows" :key="row.key" v-bind="row.item" :style="row.style">
        <span v-if="row.error" v-bind="row.errorBag">{{ row.error }}</span>
        <span v-bind="row.chevron"><span v-if="row.loading" v-bind="view.spinner"></span></span>
        <span v-bind="view.body">
          <slot name="node" :node="row.node" :ctx="row.ctx">
            <span v-if="row.icon" v-bind="view.icon" v-html="row.icon"></span>
            <span v-bind="view.label">{{ row.node.label }}</span>
          </slot>
        </span>
      </li>
    </ul>
    <div v-bind="view.live">{{ view.announcement }}</div>
  </div>
</template>
