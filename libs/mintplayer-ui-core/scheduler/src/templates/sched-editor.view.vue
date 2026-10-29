<script setup lang="ts">
// The built-in event editor: a partial of scheduler.view.vue, a native
// `popover="auto"` the core opens next to the event. Start and end compose the
// datetime picker; the core clamps them and reports refusals on the fields.
import type { SchedulerEditor } from '@mintplayer/ui-core/scheduler';

defineProps<{ editor: SchedulerEditor }>();
</script>

<template>
  <div v-bind="editor.bag">
    <div v-bind="editor.head">
      <div v-bind="editor.titleBag">{{ editor.title }}</div>
      <button v-bind="editor.close"><span aria-hidden="true">×</span></button>
    </div>
    <label v-bind="editor.field">
      <span>{{ editor.titleLabel }}</span>
      <input v-bind="editor.titleInput" :value.prop="editor.titleValue" />
      <div v-bind="editor.titleError">{{ editor.titleErrorText }}</div>
    </label>
    <div v-bind="editor.startField">
      <mp-datetime-picker
        v-model:value="editor.start"
        :max="editor.startMax"
        :disabled="editor.startDisabled"
        :inputLabel="editor.startLabel"
        :locale="editor.locale"
        :firstDayOfWeek="editor.firstDayOfWeek"
        :hour12="editor.hour12"
        :step="editor.step"
      ></mp-datetime-picker>
    </div>
    <div v-bind="editor.endField">
      <mp-datetime-picker
        v-model:value="editor.end"
        :min="editor.endMin"
        :disabled="editor.endDisabled"
        :invalid="editor.endInvalid"
        :errorText="editor.endError"
        :inputLabel="editor.endLabel"
        :locale="editor.locale"
        :firstDayOfWeek="editor.firstDayOfWeek"
        :hour12="editor.hour12"
        :step="editor.step"
      ></mp-datetime-picker>
    </div>
    <label v-bind="editor.field">
      <span>{{ editor.colorLabel }}</span>
      <input v-bind="editor.colorInput" :value.prop="editor.colorValue" />
    </label>
    <label v-bind="editor.inherit">
      <input v-bind="editor.inheritInput" :checked.prop="editor.inheritChecked" />
      <span>{{ editor.inheritLabel }}</span>
    </label>
    <div v-bind="editor.actions">
      <button v-bind="editor.save.bag">{{ editor.save.text }}</button>
      <button v-if="editor.remove" v-bind="editor.remove.bag">{{ editor.remove.text }}</button>
      <button v-bind="editor.cancel.bag">{{ editor.cancel.text }}</button>
    </div>
  </div>
</template>
