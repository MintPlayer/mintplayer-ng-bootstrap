<script setup lang="ts">
import { BsRibbon, BsRibbonTab, BsRibbonGroup, BsRibbonButton } from '@mintplayer/vue-bootstrap/ribbon';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<script setup lang="ts">
import { BsRibbon, BsRibbonTab, BsRibbonGroup, BsRibbonButton } from '@mintplayer/vue-bootstrap/ribbon';
<\/script>

<template>
  <BsRibbon>
    <BsRibbonTab label="Home">
      <BsRibbonGroup label="Clipboard">
        <BsRibbonButton label="Paste" />
        <BsRibbonButton label="Cut" />
        <BsRibbonButton label="Copy" />
      </BsRibbonGroup>
    </BsRibbonTab>
  </BsRibbon>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Ribbon</h1>
    <p class="text-body-secondary">
      Microsoft Office-style command bar with priority-based reduce steps.
    </p>
    <section>
      <h2>Basic ribbon</h2>
      <BsRibbon>
        <BsRibbonTab label="Home">
          <BsRibbonGroup label="Clipboard">
            <BsRibbonButton label="Paste" />
            <BsRibbonButton label="Cut" />
            <BsRibbonButton label="Copy" />
          </BsRibbonGroup>
        </BsRibbonTab>
        <BsRibbonTab label="Insert">
          <BsRibbonGroup label="Tables">
            <BsRibbonButton label="Table" />
          </BsRibbonGroup>
        </BsRibbonTab>
      </BsRibbon>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
