<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  INPUT_GROUP_SCOPE,
  inputGroupClasses,
  inputGroupRole,
  inputGroupScopedStyles,
  type InputGroupSize,
} from '@mintplayer/ui-core/input-group';
import { bootstrapForms, installBootstrap } from '@mintplayer/ui-core/bootstrap';

// A plain div.input-group (PRD #437 wave A): the page baseline's
// .input-group > * rules reach the children as written; the scoped sheet adds
// RTL and the sizing of controls that render their own box.
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<{ size?: InputGroupSize }>(), { size: 'md' });
const attrs = useAttrs();

installBootstrap(bootstrapForms);
installLightStyles(INPUT_GROUP_SCOPE, inputGroupScopedStyles);

const classes = computed(() => inputGroupClasses(props.size));
// The role is group only when the group is named; an explicit role wins.
const role = computed(
  () => (attrs.role as string | undefined) ?? inputGroupRole(attrs['aria-label'] != null || attrs['aria-labelledby'] != null) ?? undefined,
);
</script>

<template>
  <div :class="classes" :data-mps="INPUT_GROUP_SCOPE" v-bind="$attrs" :role="role">
    <slot />
  </div>
</template>
