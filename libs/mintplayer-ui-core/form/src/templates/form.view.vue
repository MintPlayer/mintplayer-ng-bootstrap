<script setup lang="ts">
// bs-form: a real, stamped <form>, the forms part's anchor. The action URL is bound here, never in a bag.
import type { FormView } from '@mintplayer/ui-core/form';

defineProps<{ view: FormView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root"><form mp-attrs v-bind="view.form" :action="view.action"><slot /></form></div>
</template>
