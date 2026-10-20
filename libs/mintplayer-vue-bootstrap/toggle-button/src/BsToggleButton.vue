<script setup lang="ts">
/**
 * A single Bootstrap on/off button: `<BsCheckbox type="toggle_button">`, an
 * input.btn-check + label.btn with role=button and aria-pressed (#437).
 * `v-model` is the checked state; `color`, `name`, `value`, `disabled`,
 * validity props and consumer attributes fall through to BsCheckbox, which
 * puts them on the input.
 */
import BsCheckbox from '../../checkbox/src/BsCheckbox.vue';

const checked = defineModel<boolean>({ default: false });
</script>

<template>
  <BsCheckbox v-model="checked" type="toggle_button"><slot /></BsCheckbox>
</template>
