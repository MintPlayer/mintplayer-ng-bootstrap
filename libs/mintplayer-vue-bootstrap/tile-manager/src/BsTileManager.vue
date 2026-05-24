<script setup lang="ts">
import '@mintplayer/web-components/tile-manager';
import type {
  MintTile,
  MintTileManagerElement,
} from '@mintplayer/web-components/tile-manager';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

// `tiles` is a JS-shaped array — Vue can't bind it via an attribute,
// so we forward it through the WC's property setter after mount and
// on every change. Drag/resize state mutation is event-driven
// (`tilepositionchange` / `tilelayoutchange`), so this wrapper stays a
// thin sync layer rather than carrying defineModel for the tiles list.
const props = defineProps<{
  tiles?: MintTile[];
}>();

const el = ref<MintTileManagerElement | null>(null);

const syncTiles = () => {
  if (el.value) el.value.tiles = props.tiles ?? [];
};

onMounted(syncTiles);
watch(() => props.tiles, syncTiles);
</script>

<template>
  <mp-tile-manager ref="el" v-bind="$attrs">
    <slot />
  </mp-tile-manager>
</template>
