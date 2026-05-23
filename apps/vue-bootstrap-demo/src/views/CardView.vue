<script setup lang="ts">
import { BsCard, BsCardBody, BsCardTitle, BsCardText } from '@mintplayer/vue-bootstrap/card';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
const SOURCE = `<script setup lang="ts">
import { BsCard, BsCardBody, BsCardTitle, BsCardText } from '@mintplayer/vue-bootstrap/card';
<\/script>

<template>
  <BsCard style="max-width: 20rem">
    <BsCardBody>
      <BsCardTitle>Card title</BsCardTitle>
      <BsCardText>Some quick example body text.</BsCardText>
    </BsCardBody>
  </BsCard>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Card</h1>
    <p class="text-body-secondary">
      Composable card primitives. The card family renders identically across
      Angular / React / Vue.
    </p>
    <section>
      <h2>Basic card</h2>
      <BsCard style="max-width: 20rem">
        <BsCardBody>
          <BsCardTitle>Card title</BsCardTitle>
          <BsCardText>Some quick example text to build on the card title.</BsCardText>
        </BsCardBody>
      </BsCard>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
