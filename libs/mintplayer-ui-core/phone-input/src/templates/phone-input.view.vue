<script setup lang="ts">
// The phone input's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectPhoneInput().
//
// The picker, the dial-code addon and the tel input are direct children of one
// .input-group, so Bootstrap's own group rules join them. A rich option's
// spans are cloned into the select's closed face by the browser (selectedcontent).
import type { PhoneInputView } from '@mintplayer/ui-core/phone-input';

defineProps<{ view: PhoneInputView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <div v-bind="view.group">
    <select v-bind="view.select">
      <button v-if="view.rich" type="button"><selectedcontent></selectedcontent></button>
      <option v-for="o in view.options" :key="o.key" v-bind="o.bag">
        <template v-if="view.rich"><span v-bind="view.flagBox" v-html="o.flag"></span><span v-bind="view.richLabel">{{ o.name }}</span><span v-bind="view.listOnly">{{ o.dial }}</span><span v-bind="view.closedOnly">{{ o.iso }}</span></template>
        <template v-else>{{ o.label }}</template>
      </option>
    </select>
    <span v-bind="view.addon"><span v-bind="view.flag" v-html="view.flagHtml"></span><span v-bind="view.dial">{{ view.dialText }}</span></span>
    <input mp-attrs v-bind="view.input">
  </div>
  <input v-if="view.hidden" v-bind="view.hidden">
  <div v-if="view.showFeedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  </div>
</template>
