<script setup lang="ts">
// The query builder's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectQueryBuilder(); its tree
// renders through the recursive query-builder-item partial. Every control
// names its command in data-qb-act; the core handles them all by delegation on
// the root.
import type { EditorContext, QueryBuilderView } from '@mintplayer/ui-core/query-builder';
import QueryBuilderItem from './query-builder-item.view.vue';

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
      <QueryBuilderItem :node="view.tree" :view="view" />
    </ul>
  </div>
</template>
