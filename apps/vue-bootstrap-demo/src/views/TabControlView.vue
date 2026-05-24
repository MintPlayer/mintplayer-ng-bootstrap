<script setup lang="ts">
import { ref } from 'vue';
import { BsTabControl } from '@mintplayer/vue-bootstrap/tab-control';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const active = ref('home');

const SOURCE = `<BsTabControl v-model="active">
  <span slot="home-header">Home</span>
  <mp-tab-page tab-id="home">Home content</mp-tab-page>
  <span slot="profile-header">Profile</span>
  <mp-tab-page tab-id="profile">Profile content</mp-tab-page>
</BsTabControl>`;
</script>

<template>
  <div class="demo-page">
    <h1>Tab control</h1>
    <p class="text-body-secondary">
      Native named-slot tab projection. The control owns the active-tab
      state via the <code>active-tab-id</code> attribute; consumers listen
      for <code>tab-activate</code> events.
    </p>

    <section>
      <h2>Two tabs</h2>
      <BsTabControl v-model="active">
        <span slot="home-header">Home</span>
        <mp-tab-page tab-id="home">Home content lives here.</mp-tab-page>
        <span slot="profile-header">Profile</span>
        <mp-tab-page tab-id="profile">Profile content lives here.</mp-tab-page>
      </BsTabControl>
      <p class="text-body-secondary mt-2">Active: <code>{{ active }}</code></p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
