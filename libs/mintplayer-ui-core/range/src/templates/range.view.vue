<script setup lang="ts">
// The range: a native slider. Its live value is a property; the attribute is only the default.
import type { RangeView } from '@mintplayer/ui-core/range';

defineProps<{ view: RangeView }>();
</script>

<template>
  <span mp-host ref="root" v-bind="view.root"><input mp-attrs v-bind="view.input" :value.prop="view.value" /></span>
</template>
