<script setup lang="ts">
import { BsCalendar } from '@mintplayer/vue-bootstrap/calendar';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsCalendar />";
</script>

<template>
  <div class="demo-page">
    <h1>Calendar</h1>
    <section>
      <h2>Default</h2>
      <BsCalendar />
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
