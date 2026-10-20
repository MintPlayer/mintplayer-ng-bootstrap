<script setup lang="ts">
import { ref } from 'vue';
import { BsTabControl, BsTabPage } from '@mintplayer/vue-bootstrap/tab-control';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const active = ref('home');

const SOURCE = `<BsTabControl v-model="active">
  <BsTabPage tab-id="home"><template #header>Home</template><div class="p-3">Home content</div></BsTabPage>
  <BsTabPage tab-id="profile"><template #header>Profile</template><div class="p-3">Profile content</div></BsTabPage>
  <BsTabPage tab-id="settings" disabled><template #header>Settings</template>…</BsTabPage>
</BsTabControl>`;
</script>

<template>
  <div class="demo-page">
    <h1>Tab control</h1>
    <p class="text-body-secondary">
      One native radio per tab is the selection, so the tabs switch with
      JavaScript off. Keyboard: <kbd>←</kbd>/<kbd>→</kbd> move between tabs,
      <kbd>Home</kbd>/<kbd>End</kbd> jump to the ends, and disabled tabs are skipped.
    </p>

    <section>
      <h2>Three tabs</h2>
      <BsTabControl v-model="active">
        <BsTabPage tab-id="home">
          <template #header>Home</template>
          <div class="p-3">Home content lives here.</div>
        </BsTabPage>
        <BsTabPage tab-id="profile">
          <template #header>Profile</template>
          <div class="p-3">Profile content lives here.</div>
        </BsTabPage>
        <BsTabPage tab-id="settings" disabled>
          <template #header>Settings</template>
          <div class="p-3">Settings are disabled.</div>
        </BsTabPage>
      </BsTabControl>
      <p class="text-body-secondary mt-2">Active: <code>{{ active }}</code></p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
