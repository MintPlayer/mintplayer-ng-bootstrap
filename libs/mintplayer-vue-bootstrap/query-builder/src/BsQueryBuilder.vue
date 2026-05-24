<script setup lang="ts">
// Side-effect-registers <mp-query-builder> via the upstream WC entry.
import '@mintplayer/web-components/query-builder';
import {
  MpQueryBuilderElement,
  type EntitySchema,
  type Expression,
} from '@mintplayer/web-components/query-builder';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// v-model surface: the WC's `query: Expression` property + the
// `query-change` event. The event detail is `{ tree: Expression }`
// (NOT a bare Expression — the WC wraps it in a `tree` field).
// `schema` is a separate prop (the entity catalog) — forwarded as a
// JS-object property since it's an array, not attribute-serializable.
const modelValue = defineModel<Expression>();
const props = defineProps<{
  schema?: EntitySchema[];
}>();

const el = ref<MpQueryBuilderElement | null>(null);

const syncValue = (v: Expression | undefined) => {
  if (el.value && v !== undefined) el.value.query = v;
};
const syncSchema = () => {
  if (el.value && props.schema) el.value.schema = props.schema;
};

onMounted(() => {
  syncSchema();
  syncValue(modelValue.value);
});
watch(modelValue, syncValue, { deep: true });
watch(() => props.schema, syncSchema, { deep: true });

function onQueryChange(e: Event) {
  const detail = (e as CustomEvent<{ tree: Expression }>).detail;
  if (detail) modelValue.value = detail.tree;
}
</script>

<template>
  <mp-query-builder
    ref="el"
    v-bind="$attrs"
    @query-change="onQueryChange"
  />
</template>
