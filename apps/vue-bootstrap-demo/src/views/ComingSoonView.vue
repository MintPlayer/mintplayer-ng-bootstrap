<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router';
const route = useRoute();
</script>

<template>
  <div class="demo-page">
    <h1>Coming soon</h1>
    <p class="text-body-secondary">
      The view at <code>{{ route.fullPath }}</code> is part of the in-progress
      cross-framework split — see PR #351 for the working state, or pick a
      component below as it lands on master.
    </p>
    <p>
      <RouterLink to="/">Back to home</RouterLink>
    </p>
  </div>
</template>
