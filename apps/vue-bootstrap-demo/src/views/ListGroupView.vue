<script setup lang="ts">
import { BsListGroup, BsListGroupItem } from '@mintplayer/vue-bootstrap/list-group';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<script setup lang="ts">
import { BsListGroup, BsListGroupItem } from '@mintplayer/vue-bootstrap/list-group';
<\/script>

<template>
  <BsListGroup>
    <BsListGroupItem active>The current item</BsListGroupItem>
    <BsListGroupItem>Dapibus ac facilisis in</BsListGroupItem>
    <BsListGroupItem disabled>A disabled item</BsListGroupItem>
  </BsListGroup>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>List group</h1>
    <p class="text-body-secondary">
      A <code>role="list"</code> of items. <code>active</code> marks the current item
      (<code>aria-current</code>), <code>disabled</code> mutes one (<code>aria-disabled</code>),
      <code>color</code> paints a contextual variant and <code>flush</code> drops the outer borders.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsListGroup>
        <BsListGroupItem active>The current item</BsListGroupItem>
        <BsListGroupItem>Dapibus ac facilisis in</BsListGroupItem>
        <BsListGroupItem disabled>A disabled item</BsListGroupItem>
        <BsListGroupItem color="success">A success item</BsListGroupItem>
        <BsListGroupItem color="warning">A warning item</BsListGroupItem>
      </BsListGroup>
    </section>

    <section>
      <h2>Flush</h2>
      <BsListGroup flush>
        <BsListGroupItem>Cras justo odio</BsListGroupItem>
        <BsListGroupItem>Morbi leo risus</BsListGroupItem>
        <BsListGroupItem>Porta ac consectetur ac</BsListGroupItem>
      </BsListGroup>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
