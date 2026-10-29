<script setup lang="ts">
// One node of the query builder's tree, and its children through itself: a
// recursive partial of query-builder.view.vue (PRD component-compiler-nesting
// §5.1). A group or a sub-query nests its children in a list of its own.
import type { EditorContext, QueryBuilderNode, QueryBuilderView } from '@mintplayer/ui-core/query-builder';

defineProps<{ node: QueryBuilderNode; view: QueryBuilderView }>();
defineSlots<{
  /** The value editor of a condition whose field has `editor: 'custom'`. */
  editor?: (args: { ctx: EditorContext }) => unknown;
}>();
</script>

<template>
  <li v-bind="node.item">
    <div v-if="node.kind === 'group'" v-bind="node.group.header">
      <span v-bind="node.group.logic">
        <button v-bind="node.group.and">{{ view.text.logicAnd }}</button>
        <button v-bind="node.group.or">{{ view.text.logicOr }}</button>
      </span>
      <span v-bind="node.group.actions">
        <button v-bind="node.group.addCondition">+ {{ view.text.addCondition }}</button>
        <button v-bind="node.group.addGroup">+ {{ view.text.addGroup }}</button>
        <button v-if="node.group.canAddSubquery" v-bind="node.group.addSubquery">+ {{ view.text.addSubquery }}</button>
        <button v-if="node.group.removable" v-bind="node.group.remove">×</button>
      </span>
    </div>
    <div v-else-if="node.kind === 'condition'" v-bind="node.condition.box">
      <button v-bind="node.condition.handle">⋮</button>
      <select v-bind="node.condition.field" :value.prop="node.condition.fieldValue">
        <option v-for="o in node.condition.fields" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
      </select>
      <select v-bind="node.condition.operator" :value.prop="node.condition.operatorValue">
        <option v-for="o in node.condition.operators" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
      </select>
      <span v-if="node.condition.hasEditor" v-bind="node.condition.editor.wrap">
        <slot v-if="node.condition.editor.custom" name="editor" :ctx="node.condition.editor.ctx"></slot>
        <select v-else-if="node.condition.editor.isSelect" v-bind="node.condition.editor.select" :value.prop="node.condition.editor.selectValue">
          <option v-for="o in node.condition.editor.options" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
        </select>
        <span v-else-if="node.condition.editor.isChips" v-bind="node.condition.editor.chipBox">
          <span v-for="c in node.condition.editor.chips" :key="c.key" v-bind="c.bag">
            {{ c.label }}
            <button v-bind="c.remove">×</button>
          </span>
          <input v-bind="node.condition.editor.chipAdd" />
        </span>
        <span v-else v-bind="node.condition.editor.inputBox">
          <template v-for="inp in node.condition.editor.inputs" :key="inp.key">
            <span v-if="inp.sep" v-bind="node.condition.editor.sep"> … </span>
            <input v-bind="inp.bag" />
          </template>
        </span>
      </span>
      <button v-bind="node.condition.remove">×</button>
    </div>
    <div v-else-if="node.kind === 'subquery'" v-bind="node.subquery.header">
      <span v-bind="view.subqueryField">{{ node.subquery.fieldLabel }}</span>
      <span v-bind="view.subqueryOperator">{{ node.subquery.operatorLabel }}</span>
      <span v-if="node.subquery.target" v-bind="view.subqueryTarget">({{ node.subquery.target }})</span>
      <button v-bind="node.subquery.remove">×</button>
    </div>
    <div v-else v-bind="node.note">{{ node.text }}</div>
    <ul v-if="node.children.length" v-bind="node.list">
      <QueryBuilderItem v-for="child in node.children" :key="child.key" :node="child" :view="view" />
    </ul>
  </li>
</template>
