<script setup lang="ts">
// The datatable's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectDatatable().
import type { DatatableColumnDef, DatatableView, FilterContext, RowRenderContext } from '@mintplayer/ui-core/datatable';

defineProps<{ view: DatatableView }>();
defineSlots<{
  header?: (props: { column: DatatableColumnDef }) => unknown;
  cell?: (props: { row: unknown; column: DatatableColumnDef; rowIndex: number }) => unknown;
  row?: (props: { row: unknown; rowIndex: number; ctx: RowRenderContext }) => unknown;
  filter?: (props: { column: DatatableColumnDef; ctx: FilterContext }) => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.live">{{ view.announcement }}</div>
    <div v-bind="view.shell">
      <div v-bind="view.scroll">
        <table v-bind="view.table" :style="view.tableStyle">
          <caption v-if="view.caption" v-bind="view.captionBag">{{ view.caption }}</caption>
          <thead v-bind="view.thead">
            <tr v-bind="view.headerRow">
              <th v-if="view.chevronHeader" v-bind="view.chevronHeader"></th>
              <th v-if="view.checkHeader" v-bind="view.checkHeader">
                <input v-bind="view.deselectAll" :checked.prop="false" :indeterminate.prop="view.anySelected" />
              </th>
              <th v-for="h in view.headers" :key="h.key" v-bind="h.th" :style="h.style">
                <a v-if="h.sortHref" v-bind="h.sort" :href="h.sortHref">
                  <span v-bind="h.text"><slot name="header" :column="h.column">{{ h.label }}</slot></span>
                  <span v-if="h.sortIndex" v-bind="h.sortIndex">{{ h.sortIndexText }}</span>
                </a>
                <button v-else-if="h.sortable" v-bind="h.sort">
                  <span v-bind="h.text"><slot name="header" :column="h.column">{{ h.label }}</slot></span>
                  <span v-if="h.sortIndex" v-bind="h.sortIndex">{{ h.sortIndexText }}</span>
                </button>
                <span v-else v-bind="h.plain">
                  <span v-bind="h.text"><slot name="header" :column="h.column">{{ h.label }}</slot></span>
                </span>
                <span v-if="h.resize" v-bind="h.resize"></span>
              </th>
            </tr>
            <tr v-if="view.filterRow" v-bind="view.filterRow">
              <th v-if="view.filterChevronCell" v-bind="view.filterChevronCell"></th>
              <th v-if="view.filterCheckCell" v-bind="view.filterCheckCell"></th>
              <th v-for="fc in view.filterCells" :key="fc.key" v-bind="fc.th">
                <button v-if="fc.trigger" v-bind="fc.trigger">
                  <svg v-bind="fc.icon"><path v-bind="fc.path"></path></svg>
                  <span v-if="fc.summary" v-bind="fc.summary">{{ fc.summaryText }}</span>
                </button>
                <div v-if="fc.panel" v-bind="fc.panel">
                  <div v-if="fc.open && fc.open.custom" v-bind="fc.open.body">
                    <slot name="filter" :column="fc.open.column" :ctx="fc.open.ctx"></slot>
                  </div>
                  <div v-else-if="fc.open" v-bind="fc.open.body">
                      <button v-bind="fc.open.clear">{{ fc.open.clearText }}</button>
                      <div v-if="fc.open.comparison" v-bind="fc.open.comparison.wrap">
                        <select v-bind="fc.open.comparison.operator" :value.prop="fc.open.comparison.operatorValue">
                          <option v-for="op in fc.open.comparison.operators" :key="op.key" v-bind="op.option">{{ op.text }}</option>
                        </select>
                        <input v-bind="fc.open.comparison.operand" :value.prop="fc.open.comparison.operandText" />
                      </div>
                      <small v-if="fc.open.comparison && fc.open.comparison.applied" v-bind="fc.open.comparison.applied">{{ fc.open.comparison.appliedText }}</small>
                      <input v-if="fc.open.list" v-bind="fc.open.list.search" :value.prop="fc.open.list.term" />
                      <button v-if="fc.open.list" v-bind="fc.open.list.invert">{{ fc.open.list.invertText }}</button>
                      <div v-if="fc.open.list" v-bind="fc.open.list.group">
                        <span v-if="fc.open.list.loading" v-bind="fc.open.list.loading">{{ fc.open.list.loadingText }}</span>
                        <label v-for="opt in fc.open.list.options" :key="opt.key" v-bind="opt.label">
                          <input v-bind="opt.input" :checked.prop="opt.checked" />
                          <span>{{ opt.text }}</span>
                        </label>
                        <span v-if="fc.open.list.noValues" v-bind="fc.open.list.noValues">{{ fc.open.list.noValuesText }}</span>
                      </div>
                      <span v-if="fc.open.list && fc.open.list.hasMore" v-bind="fc.open.list.hasMore">{{ fc.open.list.hasMoreText }}</span>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody v-bind="view.tbody">
            <tr v-if="view.stateCell" v-bind="view.stateRow">
              <td v-bind="view.stateCell">{{ view.stateText }}</td>
            </tr>
            <tr v-if="view.spacerTop" v-bind="view.spacerTop.tr">
              <td v-bind="view.spacerTop.td" :style="view.spacerTop.style"></td>
            </tr>
            <tr v-for="r in view.rows" :key="r.key" v-bind="r.tr">
              <td v-if="r.chevronCell" v-bind="r.chevronCell" :style="r.chevronStyle">
                <button v-if="r.chevron" v-bind="r.chevron">{{ r.chevronText }}</button>
              </td>
              <td v-if="r.checkCell" v-bind="r.checkCell">
                <input v-if="r.check" v-bind="r.check" :checked.prop="r.checked" :indeterminate.prop="r.indeterminate" />
              </td>
              <td v-if="r.placeholder" v-bind="r.placeholder">…</td>
              <slot v-else name="row" :row="r.row" :rowIndex="r.rowIndex" :ctx="r.ctx">
                <td v-for="c in r.cells" :key="c.key" v-bind="c.td"><slot name="cell" :row="r.row" :column="c.column" :rowIndex="r.rowIndex">{{ c.text }}</slot></td>
              </slot>
            </tr>
            <tr v-if="view.spacerBottom" v-bind="view.spacerBottom.tr">
              <td v-bind="view.spacerBottom.td" :style="view.spacerBottom.style"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="view.footer" v-bind="view.footer">
        <nav v-for="p in view.pagers" :key="p.key" v-bind="p.nav">
          <ul v-bind="p.list">
            <li v-for="e in p.entries" :key="e.key" v-bind="e.item">
              <span v-if="e.gap" v-bind="e.link">{{ e.text }}</span>
              <a v-else-if="e.anchor" v-bind="e.link" :href="e.href">{{ e.text }}</a>
              <button v-else v-bind="e.link">{{ e.text }}</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
    <div v-bind="view.resizePanel">
      <div v-bind="view.resizeSteps">
        <button v-bind="view.narrower"><span v-bind="view.stepGlyph">−</span></button>
        <output v-bind="view.widthOutput">{{ view.widthText }}</output>
        <button v-bind="view.wider"><span v-bind="view.stepGlyph">+</span></button>
      </div>
      <button v-bind="view.fit">{{ view.labels.fitColumn }}</button>
      <button v-bind="view.reset">{{ view.labels.resetColumn }}</button>
    </div>
  </div>
</template>
