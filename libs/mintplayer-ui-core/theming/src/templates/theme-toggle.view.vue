<script setup lang="ts">
// The theme toggle's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectThemeToggle().
import type { ThemeToggleView } from '@mintplayer/ui-core/theming';

defineProps<{ view: ThemeToggleView }>();
</script>

<template>
  <span mp-host ref="root" v-bind="view.root">
  <button v-bind="view.button"><svg v-bind="view.icon"><path v-bind="view.path"></path></svg></button>
  <span v-bind="view.description">{{ view.descriptionText }}</span>
  <span v-bind="view.live">{{ view.liveText }}</span>
  </span>
</template>
