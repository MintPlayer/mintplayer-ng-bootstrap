<script setup lang="ts" generic="T">
/**
 * Typeahead: a text input with asynchronous suggestions and free text.
 *
 * A front of the headless TypeaheadMachine (@mintplayer/ui-core/typeahead,
 * #436): this SFC renders its own template from the machine's snapshot and
 * binds the core's ARIA bags, so it behaves and reads exactly like the
 * Angular, React and web-component typeaheads. Consumer attributes land on
 * the role-bearing <input>; `role` is not forwarded, the input is a combobox
 * by contract. Rows come from the `#item="{ item, term }"` slot.
 */
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, useAttrs, useTemplateRef, watch } from 'vue';
import { trackOpenSide } from '@mintplayer/ui-core/overlay';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  connect,
  TYPEAHEAD_SCOPE,
  TypeaheadMachine,
  typeaheadScopedStyles,
  type TypeaheadLabels,
  type TypeaheadProvider,
} from '@mintplayer/ui-core/typeahead';
import { useMachine } from '../../machine/src/useMachine';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    provider?: TypeaheadProvider<T> | null;
    debounceMs?: number;
    minLength?: number;
    itemText?: (item: T) => string;
    itemKey?: (item: T) => string | number;
    disabled?: boolean;
    name?: string | null;
    inputLabel?: string | null;
    loadingLabel?: string;
    noResultsLabel?: string;
    resultsLabel?: (count: number) => string;
    errorText?: string | null;
  }>(),
  {
    provider: null,
    debounceMs: 200,
    minLength: 1,
    disabled: false,
    name: null,
    inputLabel: null,
    errorText: null,
  },
);

/** The term. Free text is a valid value; a pick writes the item's text. */
const model = defineModel<string>({ default: '' });

const emit = defineEmits<{
  select: [item: T, value: string];
  submit: [value: string];
  open: [];
  close: [];
  loadError: [error: unknown];
}>();

defineSlots<{ item?(props: { item: T; term: string }): unknown }>();

const id = `bs-typeahead-${getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)}`;

const [machine, state] = useMachine(
  () =>
    new TypeaheadMachine<T>({
      id,
      value: model.value,
      onChange: (term) => {
        model.value = term;
      },
      onSelect: (item, term) => emit('select', item, term),
      onSubmit: (term) => emit('submit', term),
      onOpen: () => emit('open'),
      onClose: () => emit('close'),
      onError: (error) => emit('loadError', error),
    }),
);

installLightStyles(TYPEAHEAD_SCOPE, typeaheadScopedStyles);

watch(() => props.provider, (provider) => (machine.provider = provider), { immediate: true });
watch(() => props.debounceMs, (ms) => (machine.debounceMs = ms), { immediate: true });
watch(() => props.minLength, (n) => (machine.minLength = n), { immediate: true });
watch(
  () => [props.itemText, props.itemKey] as const,
  ([text, key]) => {
    machine.itemText = text;
    machine.itemKey = key;
  },
  { immediate: true },
);
watch(() => props.disabled, (d) => machine.setDisabled(d), { immediate: true });
watch(() => props.errorText, (e) => machine.setErrorText(e), { immediate: true });
watch(
  () => [props.inputLabel, props.loadingLabel, props.noResultsLabel, props.resultsLabel] as const,
  ([input, loading, noResults, results]) => {
    const labels: Partial<TypeaheadLabels> = { input: input ?? null };
    if (loading !== undefined) labels.loading = loading;
    if (noResults !== undefined) labels.noResults = noResults;
    if (results !== undefined) labels.results = results;
    machine.setLabels(labels);
  },
  { immediate: true },
);
// v-model written by the consumer (not an echo of our own onChange): no query.
watch(model, (next) => {
  if (next !== machine.snapshot.term) machine.setValue(next);
});

// Flip the list above the input near the viewport bottom (mounted = browser only).
const inputEl = useTemplateRef<HTMLInputElement>('input');
const listboxEl = useTemplateRef<HTMLUListElement>('listbox');
let untrackSide = (): void => undefined;
onMounted(() => (untrackSide = trackOpenSide(machine, () => inputEl.value, () => listboxEl.value)));
onBeforeUnmount(() => untrackSide());

const api = computed(() => connect(state.value, id, { name: props.name }));
/** The input bag without `value` (bound as a DOM property) and with nulls dropped. */
const inputAttrs = computed(() => {
  const { value: _value, ...bag } = api.value.input;
  return bag;
});

function keyOf(item: T, index: number): string | number {
  return props.itemKey ? props.itemKey(item) : machine.itemTextOf(item) || index;
}

function onInput(event: Event): void {
  machine.setTerm((event.target as HTMLInputElement).value);
}

function onKeydown(event: KeyboardEvent): void {
  if (machine.keydown(event.key, event)) event.preventDefault();
}

// Consumer attrs minus `role`, which the combobox contract owns. `useAttrs()` is
// not reactive for computed(), so this is read in the template (render-time).
const consumerAttrs = useAttrs();
function forwardedAttrs(): Record<string, unknown> {
  const { role: _role, ...rest } = consumerAttrs;
  return rest;
}
</script>

<template>
  <div class="mp-typeahead" v-bind="api.root">
    <input
      ref="input"
      class="form-control"
      type="text"
      v-bind="{ ...inputAttrs, ...forwardedAttrs() }"
      role="combobox"
      :value="state.term"
      @input="onInput"
      @keydown="onKeydown"
      @blur="machine.blur()"
    />
    <ul ref="listbox" class="dropdown-menu" v-bind="api.listbox">
      <li v-if="api.status" class="ta-status" v-bind="api.status.attrs">{{ api.status.text }}</li>
      <li
        v-for="(item, index) in state.items"
        :key="keyOf(item as T, index)"
        class="dropdown-item"
        v-bind="api.option(index)"
        @mousedown.prevent
        @click="machine.pick(index)"
      >
        <slot name="item" :item="item as T" :term="state.term">{{ machine.itemTextOf(item as T) }}</slot>
      </li>
    </ul>
    <span class="visually-hidden" v-bind="api.live.attrs">{{ api.live.text }}</span>
    <div v-if="api.error" class="ta-error" v-bind="api.error.attrs">{{ api.error.text }}</div>
  </div>
</template>
