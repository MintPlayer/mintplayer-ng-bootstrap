<script setup lang="ts">
// Bootstrap's pagination: a <nav> landmark around a .pagination list. Pages are
// buttons, or real links with hrefFor; the core selects through one delegated click.
import type { PaginationRenderView } from '@mintplayer/ui-core/pagination';

defineProps<{ view: PaginationRenderView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <nav mp-attrs v-bind="view.nav">
      <ul v-bind="view.list">
        <li v-for="e in view.entries" :key="e.key" v-bind="e.item">
          <span v-if="e.gap" v-bind="e.link">{{ e.text }}</span>
          <a v-else-if="e.anchor" v-bind="e.link" :href="e.href">{{ e.text }}</a>
          <button v-else v-bind="e.link">{{ e.text }}</button>
        </li>
      </ul>
    </nav>
  </div>
</template>
