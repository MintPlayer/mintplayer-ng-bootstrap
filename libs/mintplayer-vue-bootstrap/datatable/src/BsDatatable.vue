<script setup lang="ts">
// Side-effect-registers <mp-datatable> via the upstream WC entry.
import '@mintplayer/web-components/datatable';
import {
  MpDatatable,
  type DatatableColumnDef,
} from '@mintplayer/web-components/datatable';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// Props that are JS objects (arrays, columns) must be assigned to the
// element's properties — not its attributes — because the WC reads them
// off `this.columns` / `this.data` directly. Vue's `v-bind`/`:foo="..."`
// serializes to attribute when the value is a primitive but uses
// `.prop` style under-the-hood for objects on custom elements.
const props = defineProps<{
  columns?: DatatableColumnDef[];
  data?: unknown[];
}>();

const el = ref<MpDatatable | null>(null);

// Forward `?? []` so consumers can clear the table by binding the prop
// back to `undefined` / `null`. The WC's setters (`set columns` /
// `set data` on MpDatatable) already coerce non-arrays to `[]`, so the
// explicit `?? []` here is what carries the clear gesture through — a
// truthiness guard would silently drop it and leave the previous rows.
const syncProps = () => {
  if (!el.value) return;
  el.value.columns = props.columns ?? [];
  el.value.data = props.data ?? [];
};

onMounted(syncProps);
watch(() => props.columns, syncProps);
watch(() => props.data, syncProps);
</script>

<template>
  <mp-datatable ref="el" v-bind="$attrs" />
</template>
