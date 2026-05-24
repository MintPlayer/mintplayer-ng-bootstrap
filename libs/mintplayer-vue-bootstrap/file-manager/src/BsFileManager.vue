<script setup lang="ts">
// Side-effect-registers <mp-file-manager> via the upstream WC entry.
import '@mintplayer/web-components/file-manager';
import {
  MpFileManager,
  type FileSystemNode,
} from '@mintplayer/web-components/file-manager';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// `nodes` is a JS array of FileSystemNode objects — must be assigned to
// the element property (not serialized to an attribute) because of its
// shape. Other shaped props like `dialogResolver` / `iconResolver` /
// `conflictResolver` follow the same pattern.
const props = defineProps<{
  nodes?: FileSystemNode[];
}>();

const el = ref<MpFileManager | null>(null);

const syncProps = () => {
  if (el.value) el.value.nodes = props.nodes ?? [];
};

onMounted(syncProps);
watch(() => props.nodes, syncProps, { deep: true });
</script>

<template>
  <mp-file-manager ref="el" v-bind="$attrs" />
</template>
