<script setup lang="ts">
import { BsCard, BsCardBody, BsCardTitle, BsCardText, BsCardImg, BsCardHeader, BsCardFooter } from '@mintplayer/vue-bootstrap/card';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<script setup lang="ts">
import { BsCard, BsCardBody, BsCardTitle, BsCardText, BsCardImg } from '@mintplayer/vue-bootstrap/card';
<\/script>

<template>
  <BsCard style="max-width: 20rem">
    <BsCardBody>
      <BsCardTitle>Card title</BsCardTitle>
      <BsCardText>Some quick example body text.</BsCardText>
    </BsCardBody>
  </BsCard>

  <BsCard color="primary" style="max-width: 20rem">
    <BsCardBody>
      <BsCardTitle>Primary</BsCardTitle>
      <BsCardText>Coloured variant via the color attribute.</BsCardText>
    </BsCardBody>
  </BsCard>

  <BsCard style="max-width: 20rem">
    <BsCardImg position="top" src="/favicon.svg" alt="" />
    <BsCardBody>
      <BsCardTitle>With image</BsCardTitle>
      <BsCardText>Image at the top, body below.</BsCardText>
    </BsCardBody>
  </BsCard>

  <BsCard style="max-width: 20rem">
    <BsCardHeader>Featured</BsCardHeader>
    <BsCardBody>
      <BsCardTitle>Special title treatment</BsCardTitle>
      <BsCardText>With supporting text below.</BsCardText>
    </BsCardBody>
    <BsCardFooter class="text-body-secondary">2 days ago</BsCardFooter>
  </BsCard>

  <!-- A card nested inside another card's body -->
  <BsCard style="max-width: 24rem">
    <BsCardBody>
      <BsCardTitle>Outer card</BsCardTitle>
      <BsCard>
        <BsCardBody>
          <BsCardTitle>Inner card</BsCardTitle>
          <BsCardText>Slotted into the outer card's body.</BsCardText>
        </BsCardBody>
      </BsCard>
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
      <h2>Colour variant</h2>
      <BsCard color="primary" style="max-width: 20rem">
        <BsCardBody>
          <BsCardTitle>Primary</BsCardTitle>
          <BsCardText>Coloured variant via the <code>color</code> attribute.</BsCardText>
        </BsCardBody>
      </BsCard>
    </section>

    <section>
      <h2>Image at the top</h2>
      <BsCard style="max-width: 20rem">
        <BsCardImg position="top" src="/favicon.svg" alt="" />
        <BsCardBody>
          <BsCardTitle>With image</BsCardTitle>
          <BsCardText>Image at the top, body below.</BsCardText>
        </BsCardBody>
      </BsCard>
    </section>

    <section>
      <h2>Header &amp; footer</h2>
      <BsCard style="max-width: 20rem">
        <BsCardHeader>Featured</BsCardHeader>
        <BsCardBody>
          <BsCardTitle>Special title treatment</BsCardTitle>
          <BsCardText>With supporting text below as a natural lead-in to additional content.</BsCardText>
        </BsCardBody>
        <BsCardFooter class="text-body-secondary">2 days ago</BsCardFooter>
      </BsCard>
    </section>

    <section>
      <h2>Nested card</h2>
      <BsCard style="max-width: 24rem">
        <BsCardBody>
          <BsCardTitle>Outer card</BsCardTitle>
          <BsCardText>A card can be nested inside another card's body:</BsCardText>
          <BsCard>
            <BsCardBody>
              <BsCardTitle>Inner card</BsCardTitle>
              <BsCardText>This card is slotted into the outer card's body.</BsCardText>
            </BsCardBody>
          </BsCard>
        </BsCardBody>
      </BsCard>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
