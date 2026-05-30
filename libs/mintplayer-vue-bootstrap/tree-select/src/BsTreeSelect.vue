<script setup lang="ts">
import '@mintplayer/web-components/tree-select';
import type {
  MpTreeSelect,
  TreeNode,
  TreeSelectMode,
  TreeSelectProvider,
  TreeSelectVariant,
} from '@mintplayer/web-components/tree-select';
import { h, onBeforeUnmount, onMounted, ref, render, useSlots, watch } from 'vue';
import type { Slot } from 'vue';

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

const syncConfig = () => {
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

// --- scoped-slot → render-callback bridging --------------------------------
// The WC's templates are render-callbacks returning a DOM Node. We materialize
// the matching Vue scoped slot into a container element via `render()` and hand
// that element back. Containers are unmounted on teardown.
const slots = useSlots() as Record<string, Slot | undefined>;
const containers: HTMLElement[] = [];

function track(c: HTMLElement): HTMLElement {
  containers.push(c);
  return c;
}

function nodeSlot(name: 'item' | 'suggestion') {
  const slot = slots[name];
  if (!slot) return undefined;
  const cache = new Map<string, HTMLElement>();
  return (node: TreeNode, query: string) => {
    let c = cache.get(node.id);
    if (!c) {
      c = track(document.createElement('span'));
      cache.set(node.id, c);
    }
    render(h('span', null, slot({ node, query })), c);
    return c;
  };
}

function valueSlot() {
  const slot = slots.button;
  if (!slot) return undefined;
  const c = track(document.createElement('span'));
  return (value: TreeNode | TreeNode[] | null) => {
    render(h('span', null, slot({ value })), c);
    return c;
  };
}

function staticSlot(name: 'header' | 'footer' | 'noResults' | 'enterSearchTerm') {
  const slot = slots[name];
  if (!slot) return undefined;
  const c = track(document.createElement('span'));
  return () => {
    render(h('span', null, slot()), c);
    return c;
  };
}

const applyTemplates = () => {
  const e = el.value;
  if (!e) return;
  e.itemTemplate = nodeSlot('item');
  e.suggestionTemplate = nodeSlot('suggestion');
  e.buttonTemplate = valueSlot();
  e.headerTemplate = staticSlot('header');
  e.footerTemplate = staticSlot('footer');
  e.noResultsTemplate = staticSlot('noResults');
  e.enterSearchTermTemplate = staticSlot('enterSearchTerm');
};

onMounted(() => {
  syncConfig();
  applyTemplates();
  if (el.value) el.value.value = model.value;
});

// Watch the individual scalar/object props (not a deep spread — that would
// deep-traverse the whole provider tree on every reactive tick).
watch(
  () => [
    props.mode,
    props.variant,
    props.cascadeSelect,
    props.placeholder,
    props.showClear,
    props.panelScrollHeight,
    props.searchDebounceMs,
    props.disabled,
    props.provider,
  ],
  syncConfig,
);
watch(model, (v) => {
  if (el.value) el.value.value = v ?? null;
});
onBeforeUnmount(() => {
  for (const c of containers) render(null, c);
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
