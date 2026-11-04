<script setup lang="ts">
// A card link: the box carries the sibling spacing, the <a> is the link.
import type { CardLinkView } from '@mintplayer/ui-core/card';

defineProps<{ view: CardLinkView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <span mp-host ref="root" v-bind="view.root"><a mp-attrs v-bind="view.link" :href="view.href"><slot /></a></span>
</template>
