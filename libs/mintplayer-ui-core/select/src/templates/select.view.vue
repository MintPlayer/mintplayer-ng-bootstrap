<script setup lang="ts">
// The select's markup, compiled into the Angular, React, Vue and Lit fronts
// (PRD #437 D10). `view` comes from connectSelect().
import type { SelectOption, SelectView } from '@mintplayer/ui-core/select';

defineProps<{ view: SelectView }>();
defineSlots<{
  /** Rich content of one option (customizable select only); its text stays the accessible name. */
  option?: (args: { option: SelectOption }) => unknown;
  /** `<option>` / `<optgroup>` children, used when no `options` are given. */
  default?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <select mp-attrs v-bind="view.select" :value.prop="view.value">
    <button v-if="view.rich && $slots.option" type="button"><selectedcontent></selectedcontent></button>
    <template v-if="view.items">
      <template v-for="item in view.items" :key="item.key">
        <optgroup v-if="item.group" v-bind="item.group">
          <option v-for="o in item.options" :key="o.key" v-bind="o.bag">
            <slot v-if="view.rich" name="option" :option="o.option">{{ o.option.label }}</slot>
            <template v-else>{{ o.option.label }}</template>
          </option>
        </optgroup>
        <template v-else>
          <option v-for="o in item.options" :key="o.key" v-bind="o.bag">
            <slot v-if="view.rich" name="option" :option="o.option">{{ o.option.label }}</slot>
            <template v-else>{{ o.option.label }}</template>
          </option>
        </template>
      </template>
    </template>
    <slot v-else />
  </select>
  <div v-if="view.showFeedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  </div>
</template>
