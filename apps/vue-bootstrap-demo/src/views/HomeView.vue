<script setup lang="ts">
import { RouterLink } from 'vue-router';</script>

<template>
  <div class="demo-page">
    <h1>Vue demo for @mintplayer/web-components</h1>
    <p class="text-body-secondary">
      Live showcase of the Lit web components exposed via
      <code>@mintplayer/vue-bootstrap</code>. The same WCs render identically
      in the Angular and React demos — switch via the brand-mark links at the
      top right.
    </p>
    <section>
      <h2>Featured pages</h2>
      <ul>
        <li><RouterLink to="/enterprise/scheduler">Scheduler</RouterLink> — calendar/grid layout for events</li>
        <li><RouterLink to="/enterprise/dock">Dock manager</RouterLink> — draggable, dockable panes</li>
        <li><RouterLink to="/enterprise/ribbon">Ribbon</RouterLink> — MS Office-style command bar</li>
        <li><RouterLink to="/basic/datepicker">Datepicker</RouterLink> — date input with native v-model</li>
        <li><RouterLink to="/basic/card">Card</RouterLink> — composable card primitives</li>
        <li><RouterLink to="/basic/code-snippet">Code snippet</RouterLink> — syntax-highlighted source with copy-to-clipboard</li>
      </ul>
    </section>
  </div>
</template>
