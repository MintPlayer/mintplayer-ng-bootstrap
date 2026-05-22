<script setup lang="ts">
import { BsTabControl, BsTabPage } from '@mintplayer/vue-bootstrap/tab-control';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
const SOURCE = "<BsTabControl>\n  <BsTabPage>\n    <span slot=\"header\">Tab 1</span>\n    <p>Content of tab 1.</p>\n  </BsTabPage>\n  <BsTabPage>\n    <span slot=\"header\">Tab 2</span>\n    <p>Content of tab 2.</p>\n  </BsTabPage>\n</BsTabControl>";
</script>

<template>
  <div class="demo-page">
    <h1>Tab control</h1>
    <section>
      <h2>Default</h2>
      <BsTabControl style="min-height: 200px">
          <BsTabPage>
            <span slot="header">Tab 1</span>
            <p>Content of tab 1.</p>
          </BsTabPage>
          <BsTabPage>
            <span slot="header">Tab 2</span>
            <p>Content of tab 2.</p>
          </BsTabPage>
        </BsTabControl>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
