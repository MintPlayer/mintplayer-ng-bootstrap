<script setup lang="ts">
/**
 * Checkbox, switch or toggle button: a native <input type=checkbox> in
 * Bootstrap's .form-check / .form-switch / .btn-check markup (#437), with the
 * ARIA contract from @mintplayer/ui-core/checkbox. Consumer attributes land
 * on the input; a consumer `role` reaches a plain checkbox only — `switch`
 * and `button` are the contract of the other types.
 *
 * `v-model` is the checked state, `v-model:indeterminate` the mixed state
 * (a user toggle clears it).
 */
import { computed, useAttrs, useId, useTemplateRef, watchEffect } from 'vue';
import {
  checkboxClasses,
  connectCheckbox,
  effectiveIndeterminate,
  type CheckboxType,
  type ToggleButtonColor,
} from '@mintplayer/ui-core/checkbox';
import { bootstrapForms, installBootstrap } from '@mintplayer/ui-core/bootstrap';

installBootstrap(bootstrapForms);

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    type?: CheckboxType;
    /** Button colour of a toggle_button; ignored by the other types. */
    color?: ToggleButtonColor;
    name?: string | null;
    value?: string | null;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    errorText?: string | null;
  }>(),
  {
    type: 'checkbox',
    color: 'primary',
    name: null,
    value: null,
    disabled: false,
    required: false,
    invalid: false,
    errorText: null,
  },
);

const checked = defineModel<boolean>({ default: false });
const indeterminate = defineModel<boolean>('indeterminate', { default: false });

// useId, not the instance uid: it matches between the server render and hydration.
const rootId = `bs-checkbox-${useId()}`;

const state = computed(() => ({
  type: props.type,
  checked: checked.value,
  indeterminate: effectiveIndeterminate({ type: props.type, indeterminate: indeterminate.value }),
  disabled: props.disabled,
  required: props.required,
  invalid: props.invalid,
  name: props.name,
  value: props.value,
  errorText: props.errorText,
}));
const classes = computed(() => checkboxClasses(props.type, props.color, props.invalid));

// `useAttrs()` is not reactive for computed(), so the merge is read in the
// template (render-time), like the typeahead front.
const consumerAttrs = useAttrs();
function inputAttrs(): Record<string, unknown> {
  const { 'aria-describedby': describedBy, role, ...rest } = consumerAttrs;
  const bags = connectCheckbox(state.value, rootId, (describedBy as string | undefined) ?? null);
  return { ...bags.input, ...rest, role: bags.input.role ?? role ?? null };
}
const bags = computed(() => connectCheckbox(state.value, rootId));
function inputId(): string {
  return String(consumerAttrs['id'] ?? bags.value.input.id);
}

// indeterminate has no attribute; aria-checked="mixed" carries it in server HTML.
const inputEl = useTemplateRef<HTMLInputElement>('input');
watchEffect(() => {
  if (inputEl.value) inputEl.value.indeterminate = state.value.indeterminate;
}, { flush: 'post' });

function onChange(event: Event): void {
  checked.value = (event.target as HTMLInputElement).checked;
  indeterminate.value = false;
}
</script>

<template>
  <template v-if="classes.root === null">
    <input ref="input" type="checkbox" :class="classes.input" v-bind="inputAttrs()" :checked="checked" @change="onChange" />
    <label :class="classes.label" :for="inputId()"><slot /></label>
  </template>
  <label v-else :class="classes.root">
    <input ref="input" type="checkbox" :class="classes.input" v-bind="inputAttrs()" :checked="checked" @change="onChange" />
    <span :class="classes.label"><slot /></span>
  </label>
  <div v-if="bags.feedback" v-bind="bags.feedback.attrs">{{ bags.feedback.text }}</div>
</template>
