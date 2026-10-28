<script setup lang="ts">
// The file manager's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from fileManagerCore: the bags from
// connectFileManager() plus the handlers and model bindings of the composed
// splitter, treeview and datatable. The datatable's `cell` slot reads the
// core's row by `rowIndex`: the core sorts the rows itself (autoSort off), so
// the datatable's index is the index into `view.rows`.
import type { FileManagerTemplateView } from '@mintplayer/ui-core/file-manager';

defineProps<{ view: FileManagerTemplateView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.live">{{ view.announcement }}</div>
    <div v-bind="view.alert">{{ view.alertText }}</div>
    <div v-bind="view.toolbar">
      <button v-for="a in view.actions" :key="a.key" v-bind="a.bag"><span v-bind="view.glyph">{{ a.glyph }}</span>{{ a.label }}</button>
      <span v-bind="view.spacer"></span>
      <input v-bind="view.search" />
      <div v-bind="view.viewToggle">
        <button v-bind="view.listToggle"><span v-bind="view.toggleIcon" v-html="view.listIcon"></span></button>
        <button v-bind="view.iconsToggle"><span v-bind="view.toggleIcon" v-html="view.gridIcon"></span></button>
      </div>
    </div>
    <nav v-bind="view.breadcrumb">
      <span v-for="c in view.crumbs" :key="c.key" v-bind="view.crumbItem">
        <span v-if="c.separator" v-bind="view.crumbSeparator">›</span>
        <button v-bind="c.bag">{{ c.label }}</button>
      </span>
    </nav>
    <div v-bind="view.splitArea">
      <mp-splitter :orientation="'horizontal'" :minPanelSize="120" :touchMode="view.touchMode">
        <mp-splitter-panel>
          <div v-bind="view.treePane">
            <mp-treeview
              :items="view.tree.items"
              v-model:expandedIds="view.treeExpanded"
              :selectedIds="view.tree.selected"
              :selectionMode="'single'"
              :hideBorders="true"
              :iconResolver="view.tree.icon"
              :loadChildren="view.treeLoad"
              :inputLabel="view.tree.label"
              @nodeSelect="view.onTreeSelect"
            ></mp-treeview>
          </div>
        </mp-splitter-panel>
        <mp-splitter-panel>
          <div v-bind="view.contentPane">
            <div v-bind="view.contentBody">
              <mp-datatable
                v-if="view.list"
                :columns="view.columns"
                :data="view.data"
                :rowKey="view.rowKey"
                :selectionMode="view.selectionMode"
                v-model:selectedIds="view.selection"
                v-model:sortColumns="view.sort"
                :autoSort="false"
                :cutIds="view.cutIds"
                :virtualScroll="true"
                :itemSize="40"
                :fill="true"
                :emptyMessage="view.emptyMessage"
                :inputLabel="view.listLabel"
                @rowDblClick="view.onRowDblClick"
                @rowContextMenu="view.onRowContextMenu"
              >
                <template #cell="{ column, rowIndex }">
                  <span v-if="column.name === 'name' && view.rows[rowIndex]" v-bind="view.rows[rowIndex].cell">
                    <span v-bind="view.rowIcon" v-html="view.rows[rowIndex].icon"></span>
                    <input v-if="view.rows[rowIndex].renameInput" v-bind="view.rows[rowIndex].renameInput" />
                    <span v-else v-bind="view.rowName">{{ view.rows[rowIndex].name }}</span>
                  </span>
                  <span v-else-if="view.rows[rowIndex]" v-bind="view.cellText">{{ view.rows[rowIndex].texts[column.name] }}</span>
                </template>
              </mp-datatable>
              <div v-else v-bind="view.grid">
                <button v-for="r in view.rows" :key="r.id" v-bind="r.card">
                  <span v-bind="view.cardIcon" v-html="r.icon"></span>
                  <span v-bind="view.cardName">{{ r.name }}</span>
                </button>
              </div>
            </div>
            <div v-bind="view.overlay">{{ view.dropText }}</div>
          </div>
        </mp-splitter-panel>
      </mp-splitter>
    </div>
    <ul v-if="view.menu" v-bind="view.menu.list" :style="view.menu.style">
      <li v-for="i in view.menu.items" :key="i.key" v-bind="i.li">
        <button v-if="i.button" v-bind="i.button">{{ i.label }}</button>
      </li>
    </ul>
  </div>
</template>
