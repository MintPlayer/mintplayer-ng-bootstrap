<script setup lang="ts">
// The query builder's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectQueryBuilder(): the tree is
// flat rows in reading order, each with its level, so no front needs a
// recursive template. Every control names its command in data-qb-act; the
// core handles them all by delegation on the root.
import type { EditorContext, QueryBuilderView } from '@mintplayer/ui-core/query-builder';

defineProps<{ view: QueryBuilderView }>();
defineSlots<{
  /** The value editor of a condition whose field has `editor: 'custom'`. */
  editor?: (args: { ctx: EditorContext }) => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-if="view.toolbar" v-bind="view.toolbarBox">
      <label v-bind="view.toolbarLabel">
        {{ view.text.entity }}:
        <select v-bind="view.entity" :value.prop="view.entityValue">
          <option v-for="o in view.entities" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
        </select>
      </label>
      <span v-if="view.projection" v-bind="view.projectionBox">
        <span v-bind="view.toolbarLabel">{{ view.text.columns }}:</span>
        <label v-for="p in view.projections" :key="p.key" v-bind="p.box">
          <input v-bind="p.input" />
          {{ p.label }}
        </label>
      </span>
      <span v-if="view.projection" v-bind="view.sortBox">
        <span v-bind="view.toolbarLabel">{{ view.text.sortBy }}:</span>
        <span v-for="s in view.sorts" :key="s.key" v-bind="s.box">
          <select v-bind="s.field" :value.prop="s.fieldValue">
            <option v-for="o in s.fields" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
          </select>
          <select v-bind="s.direction" :value.prop="s.directionValue">
            <option v-for="o in s.directions" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
          </select>
          <button v-bind="s.remove">×</button>
        </span>
        <button v-bind="view.sortAdd">+ {{ view.text.addSort }}</button>
      </span>
    </div>
    <div v-if="view.saved" v-bind="view.savedBox">
      <div v-bind="view.savedList">
        <span v-if="view.savedQueries.length === 0" v-bind="view.savedEmpty">{{ view.text.noSavedQueries }}</span>
        <span v-for="q in view.savedQueries" :key="q.key" v-bind="q.box">
          <button v-bind="q.load">{{ q.loadText }}</button>
          <button v-bind="q.remove">{{ view.text.deleteQuery }}</button>
        </span>
      </div>
      <span v-bind="view.savedNew">
        <input v-bind="view.savedName" />
        <button v-bind="view.savedSave">💾 {{ view.text.saveCurrentAs }}</button>
      </span>
    </div>
    <pre v-if="view.preview" v-bind="view.previewBox">{{ view.previewText }}</pre>
    <ul v-bind="view.list">
      <li v-for="row in view.rows" :key="row.key" v-bind="row.item" :style="row.style">
        <div v-if="row.kind === 'group'" v-bind="row.group.header">
          <span v-bind="row.group.logic">
            <button v-bind="row.group.and">{{ view.text.logicAnd }}</button>
            <button v-bind="row.group.or">{{ view.text.logicOr }}</button>
          </span>
          <span v-bind="row.group.actions">
            <button v-bind="row.group.addCondition">+ {{ view.text.addCondition }}</button>
            <button v-bind="row.group.addGroup">+ {{ view.text.addGroup }}</button>
            <button v-if="row.group.canAddSubquery" v-bind="row.group.addSubquery">+ {{ view.text.addSubquery }}</button>
            <button v-if="row.group.removable" v-bind="row.group.remove">×</button>
          </span>
        </div>
        <div v-else-if="row.kind === 'condition'" v-bind="row.condition.box">
          <button v-bind="row.condition.handle">⋮</button>
          <select v-bind="row.condition.field" :value.prop="row.condition.fieldValue">
            <option v-for="o in row.condition.fields" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
          </select>
          <select v-bind="row.condition.operator" :value.prop="row.condition.operatorValue">
            <option v-for="o in row.condition.operators" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
          </select>
          <span v-if="row.condition.hasEditor" v-bind="row.condition.editor.wrap">
            <slot v-if="row.condition.editor.custom" name="editor" :ctx="row.condition.editor.ctx"></slot>
            <select v-else-if="row.condition.editor.isSelect" v-bind="row.condition.editor.select" :value.prop="row.condition.editor.selectValue">
              <option v-for="o in row.condition.editor.options" :key="o.key" v-bind="o.bag">{{ o.label }}</option>
            </select>
            <span v-else-if="row.condition.editor.isChips" v-bind="row.condition.editor.chipBox">
              <span v-for="c in row.condition.editor.chips" :key="c.key" v-bind="c.bag">
                {{ c.label }}
                <button v-bind="c.remove">×</button>
              </span>
              <input v-bind="row.condition.editor.chipAdd" />
            </span>
            <span v-else v-bind="row.condition.editor.inputBox">
              <template v-for="inp in row.condition.editor.inputs" :key="inp.key">
                <span v-if="inp.sep" v-bind="row.condition.editor.sep"> … </span>
                <input v-bind="inp.bag" />
              </template>
            </span>
          </span>
          <button v-bind="row.condition.remove">×</button>
        </div>
        <div v-else-if="row.kind === 'subquery'" v-bind="row.subquery.header">
          <span v-bind="view.subqueryField">{{ row.subquery.fieldLabel }}</span>
          <span v-bind="view.subqueryOperator">{{ row.subquery.operatorLabel }}</span>
          <span v-if="row.subquery.target" v-bind="view.subqueryTarget">({{ row.subquery.target }})</span>
          <button v-bind="row.subquery.remove">×</button>
        </div>
        <div v-else v-bind="row.note">{{ row.text }}</div>
      </li>
    </ul>
  </div>
</template>
