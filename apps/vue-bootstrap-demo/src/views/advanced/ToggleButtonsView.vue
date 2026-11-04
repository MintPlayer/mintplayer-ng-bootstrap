<script setup lang="ts">
import { ref } from 'vue';
import { BsNavbarToggler } from '@mintplayer/vue-bootstrap/navbar-toggler';
import { BsPlaylistToggler } from '@mintplayer/vue-bootstrap/playlist-toggler';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const open = ref(false);
const playlist = ref(false);
const SOURCE = `<BsNavbarToggler v-model:open="open" controls="menu" label="Show the menu" />
<ul id="menu" :hidden="!open">…</ul>`;
</script>

<template>
  <div class="demo-page">
    <h1>Toggle buttons</h1>
    <p class="text-body-secondary">
      <code>BsNavbarToggler</code> is a real button whose three bars cross while <code>open</code>.
      It reports <code>aria-expanded</code>, and <code>aria-controls</code> with <code>controls</code>.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsNavbarToggler v-model:open="open" controls="demo-menu" label="Show the menu" />
      <ul id="demo-menu" :hidden="!open">
        <li>Home</li>
        <li>About</li>
      </ul>
    </section>

    <section>
      <h2>Playlist toggler</h2>
      <p><code>BsPlaylistToggler</code> has the same API; its bars draw a play arrow while closed.</p>
      <BsPlaylistToggler v-model:open="playlist" controls="demo-playlist" label="Show the playlist" />
      <ol id="demo-playlist" :hidden="!playlist">
        <li>First song</li>
        <li>Second song</li>
      </ol>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
