<script setup lang="ts">
/**
 * A <div role=radiogroup> around <BsRadio>s (#437). It hands them one name,
 * so they are native radios of one set: the browser supplies exclusivity, the
 * single tab stop and arrow move-and-select, with JavaScript off as well.
 * Name the group with aria-label / aria-labelledby.
 *
 * `v-model` is the selected radio's value (string | null).
 */
import { computed, provide, useId } from 'vue';
import { connectRadioGroup, radioGroupName } from '@mintplayer/ui-core/radio';
import { radioGroupKey } from '../../radio/src/radio-group-key';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** The radios' shared name; generated when omitted, so native grouping always forms. */
    name?: string | null;
    disabled?: boolean;
    required?: boolean;
  }>(),
  { name: null, disabled: false, required: false },
);

const modelValue = defineModel<string | null>({ default: null });

// useId, not the instance uid: it matches between the server render and hydration.
const rootId = `bs-radio-group-${useId()}`;

provide(radioGroupKey, {
  name: computed(() => props.name ?? radioGroupName(rootId)),
  value: computed(() => modelValue.value),
  disabled: computed(() => props.disabled),
  required: computed(() => props.required),
  select(value: string) {
    modelValue.value = value;
  },
});

const groupAttrs = computed(() => connectRadioGroup({ required: props.required, disabled: props.disabled }));
</script>

<template>
  <!-- The bag goes last: radiogroup is the contract role, not a consumer choice. -->
  <div v-bind="{ ...$attrs, ...groupAttrs }">
    <slot />
  </div>
</template>
