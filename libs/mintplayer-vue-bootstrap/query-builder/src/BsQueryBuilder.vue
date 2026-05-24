<script setup lang="ts">
// Side-effect-registers <mp-query-builder> via the upstream WC entry.
import '@mintplayer/web-components/query-builder';
import {
  MpQueryBuilderElement,
  type EntitySchema,
  type Expression,
  type SavedQuery,
  type SortDescriptor,
  type EditorRegistry,
  type QueryBuilderMessages,
} from '@mintplayer/web-components/query-builder';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// v-model surface: the WC's `query: Expression` property + the
// `query-change` event. The event detail is `{ tree: Expression }`
// (NOT a bare Expression — the WC wraps it in a `tree` field).
//
// Object/array props (`schema`, `selectedFields`, `sortBy`, `savedQueries`,
// `editorRegistry`, `messages`) are `attribute: false` on the WC — they
// need to be set as JS properties, NOT serialized to attributes. Plumb
// each through onMounted + deep watchers.
const modelValue = defineModel<Expression>();
const props = defineProps<{
  schema?: EntitySchema[];
  selectedFields?: string[];
  sortBy?: SortDescriptor[];
  savedQueries?: SavedQuery[];
  editorRegistry?: EditorRegistry;
  messages?: Partial<QueryBuilderMessages>;
}>();

const el = ref<MpQueryBuilderElement | null>(null);

const syncValue = (v: Expression | undefined) => {
  if (el.value && v !== undefined) el.value.query = v;
};
const syncObjectProps = () => {
  if (!el.value) return;
  if (props.schema) el.value.schema = props.schema;
  if (props.selectedFields) el.value.selectedFields = props.selectedFields;
  if (props.sortBy) el.value.sortBy = props.sortBy;
  if (props.savedQueries) el.value.savedQueries = props.savedQueries;
  if (props.editorRegistry) el.value.editorRegistry = props.editorRegistry;
  if (props.messages) el.value.messages = props.messages;
};

onMounted(() => {
  syncObjectProps();
  syncValue(modelValue.value);
});
watch(modelValue, syncValue, { deep: true });
watch(
  () => [props.schema, props.selectedFields, props.sortBy, props.savedQueries, props.editorRegistry, props.messages],
  syncObjectProps,
  { deep: true },
);

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
