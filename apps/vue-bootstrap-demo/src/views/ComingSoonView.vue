<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router';
const route = useRoute();
</script>

<template>
  <div class="demo-page">
    <h1>Coming soon</h1>
    <p class="text-body-secondary">
      The view at <code>{{ route.fullPath }}</code> is part of the in-progress
      cross-framework migration — this component is still being extracted
      from <code>@mintplayer/ng-bootstrap</code> into the framework-agnostic
      <code>@mintplayer/web-components</code> library. Pick another component
      from the sidebar, or check back as each one lands.
    </p>
    <p>
      <RouterLink to="/">Back to home</RouterLink>
    </p>
  </div>
</template>
