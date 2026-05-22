<script setup lang="ts">
import { BsSplitter } from '@mintplayer/vue-bootstrap/splitter';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsSplitter>\n  <div slot=\"panel-0\">Left panel</div>\n  <div slot=\"panel-1\">Right panel</div>\n</BsSplitter>";
</script>

<template>
  <div class="demo-page">
    <h1>Splitter</h1>
    <section>
      <h2>Default</h2>
      <div style="height: 300px">
          <BsSplitter>
            <div slot="panel-0" style="padding: 1rem">Left panel</div>
            <div slot="panel-1" style="padding: 1rem">Right panel</div>
          </BsSplitter>
        </div>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
