<script setup lang="ts">
/**
 * A native <input type=radio> in Bootstrap's .form-check / .btn-check markup
 * (#437), with the ARIA contract from @mintplayer/ui-core/radio. Inside a
 * <BsRadioGroup> it takes the group's name and selection, so the browser
 * supplies one-of-N, the single tab stop and arrow move-and-select. Consumer
 * attributes land on the input.
 *
 * `v-model` is the checked state of a radio outside a group.
 */
import { computed, inject, useAttrs, useId } from 'vue';
import { connectRadio, radioClasses, type RadioType } from '@mintplayer/ui-core/radio';
import type { ToggleButtonColor } from '@mintplayer/ui-core/checkbox';
import { radioGroupKey } from './radio-group-key';
import { bootstrapForms, installBootstrap } from '@mintplayer/ui-core/bootstrap';

installBootstrap(bootstrapForms);

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    type?: RadioType;
    /** Button colour of a toggle_button; ignored by radio. */
    color?: ToggleButtonColor;
    /** The value the group reports when this radio is picked. */
    value?: string | null;
    /** Only for a radio outside a group; inside one, the group's name wins. */
    name?: string | null;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    errorText?: string | null;
  }>(),
  {
    type: 'radio',
    color: 'secondary',
    value: null,
    name: null,
    disabled: false,
    required: false,
    invalid: false,
    errorText: null,
  },
);

const ownChecked = defineModel<boolean>({ default: false });
const group = inject(radioGroupKey, null);

// useId, not the instance uid: it matches between the server render and hydration.
const rootId = `bs-radio-${useId()}`;

const checked = computed(() => group
  ? group.value.value !== null && group.value.value === props.value
  : ownChecked.value);
const state = computed(() => ({
  type: props.type,
  checked: checked.value,
  disabled: props.disabled || !!group?.disabled.value,
  required: props.required || !!group?.required.value,
  invalid: props.invalid,
  name: group?.name.value ?? props.name,
  value: props.value,
  errorText: props.errorText,
}));
const classes = computed(() => radioClasses(props.type, props.color, props.invalid));

// `useAttrs()` is not reactive for computed(), so the merge is read in the
// template (render-time), like the checkbox front.
const consumerAttrs = useAttrs();
function inputAttrs(): Record<string, unknown> {
  const { 'aria-describedby': describedBy, ...rest } = consumerAttrs;
  const bags = connectRadio(state.value, rootId, (describedBy as string | undefined) ?? null);
  return { ...bags.input, ...rest };
}
const bags = computed(() => connectRadio(state.value, rootId));
function inputId(): string {
  return String(consumerAttrs['id'] ?? bags.value.input.id);
}

function onChange(event: Event): void {
  const isChecked = (event.target as HTMLInputElement).checked;
  if (group && props.value !== null) group.select(props.value);
  else ownChecked.value = isChecked;
}
</script>

<template>
  <template v-if="classes.root === null">
    <input type="radio" :class="classes.input" v-bind="inputAttrs()" :checked="checked" @change="onChange" />
    <label :class="classes.label" :for="inputId()"><slot /></label>
  </template>
  <label v-else :class="classes.root">
    <input type="radio" :class="classes.input" v-bind="inputAttrs()" :checked="checked" @change="onChange" />
    <span :class="classes.label"><slot /></span>
  </label>
  <div v-if="bags.feedback" v-bind="bags.feedback.attrs">{{ bags.feedback.text }}</div>
</template>
