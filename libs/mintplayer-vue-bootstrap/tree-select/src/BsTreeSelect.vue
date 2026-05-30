<script setup lang="ts">
import '@mintplayer/web-components/tree-select';
import type {
  MpTreeSelect,
  TreeNode,
  TreeSelectMode,
  TreeSelectProvider,
  TreeSelectVariant,
} from '@mintplayer/web-components/tree-select';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

// `provider` is an object and `value` carries TreeNode objects, so neither can
// ride a DOM attribute — both are pushed to the element via property setters.
const props = withDefaults(
  defineProps<{
    provider?: TreeSelectProvider;
    mode?: TreeSelectMode;
    variant?: TreeSelectVariant;
    cascadeSelect?: boolean;
    placeholder?: string;
    showClear?: boolean;
    panelScrollHeight?: string;
    searchDebounceMs?: number;
    disabled?: boolean;
  }>(),
  {
    mode: 'single',
    variant: 'textbox',
    cascadeSelect: false,
    placeholder: '',
    showClear: false,
    panelScrollHeight: '300px',
    searchDebounceMs: 200,
    disabled: false,
  },
);

const model = defineModel<TreeNode | TreeNode[] | null>({ default: null });
const el = ref<MpTreeSelect | null>(null);

const syncAll = () => {
  const e = el.value;
  if (!e) return;
  e.mode = props.mode;
  e.variant = props.variant;
  e.cascadeSelect = props.cascadeSelect;
  e.placeholder = props.placeholder;
  e.showClear = props.showClear;
  e.panelScrollHeight = props.panelScrollHeight;
  e.searchDebounceMs = props.searchDebounceMs;
  e.disabled = props.disabled;
  e.provider = props.provider;
};

onMounted(() => {
  syncAll();
  if (el.value) el.value.value = model.value;
});
watch(() => ({ ...props }), syncAll, { deep: true });
watch(model, (v) => {
  if (el.value) el.value.value = v ?? null;
});

function onValueChange(ev: Event) {
  const detail = (ev as CustomEvent<{ value: TreeNode | TreeNode[] | null }>).detail;
  model.value = detail?.value ?? null;
}
</script>

<template>
  <mp-tree-select
    ref="el"
    v-bind="$attrs"
    @value-change="onValueChange"
  />
</template>
