<script setup lang="ts">
import { ref } from 'vue';
import { BsAccordion, BsAccordionItem } from '@mintplayer/vue-bootstrap/accordion';
import type { AccordionTabToggleDetail } from '@mintplayer/vue-bootstrap/accordion';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<BsAccordion multi highlight-active-tab @tab-toggle="onToggle">
  <BsAccordionItem>
    <template #header>Profile</template>
    Profile content
  </BsAccordionItem>
</BsAccordion>`;

const SECTIONS = [
  { title: 'Profile', body: 'Profile content' },
  { title: 'Sign in', body: 'Sign-in content' },
  { title: 'Payment', body: 'Payment content' },
];

const lastToggle = ref('—');

function onToggle(detail: AccordionTabToggleDetail) {
  lastToggle.value = `tab ${detail.index} → ${detail.active ? 'open' : 'closed'}`;
}
</script>

<template>
  <div class="demo-page">
    <h1>Accordion</h1>
    <p>
      <code>BsAccordion</code> wraps the framework-agnostic <code>&lt;mp-accordion&gt;</code>
      web component. Headers and bodies come from <code>BsAccordionItem</code>, which renders
      them as siblings so the element can place each one in its own slot.
    </p>
    <p>
      With JavaScript disabled the accordion stays interactive: the server-rendered shadow DOM
      carries a hidden radio (or checkbox, under <code>multi</code>) per tab, so opening and
      closing are pure CSS.
    </p>

    <section data-demo="single">
      <h2>Single-open</h2>
      <BsAccordion highlight-active-tab @tab-toggle="onToggle">
        <BsAccordionItem v-for="section in SECTIONS" :key="section.title">
          <template #header>{{ section.title }}</template>
          <span class="d-block px-3 py-2">{{ section.body }}</span>
        </BsAccordionItem>
      </BsAccordion>
      <p class="mt-2">Last toggle: <code>{{ lastToggle }}</code></p>
    </section>

    <section data-demo="multi">
      <h2>Multi</h2>
      <BsAccordion multi>
        <BsAccordionItem v-for="section in SECTIONS" :key="section.title">
          <template #header>{{ section.title }}</template>
          <span class="d-block px-3 py-2">{{ section.body }}</span>
        </BsAccordionItem>
      </BsAccordion>
    </section>

    <section data-demo="nested">
      <h2>Nested</h2>
      <p>Closing an outer tab collapses every accordion inside it, at any depth.</p>
      <BsAccordion class="multi-level">
        <BsAccordionItem>
          <template #header>Profile</template>
          <BsAccordion>
            <BsAccordionItem>
              <template #header>Email</template>
              <span class="d-block px-3 py-2">info&#64;example.com</span>
            </BsAccordionItem>
            <BsAccordionItem>
              <template #header>Username</template>
              <span class="d-block px-3 py-2">user-name</span>
            </BsAccordionItem>
          </BsAccordion>
        </BsAccordionItem>
        <BsAccordionItem>
          <template #header>Sign in</template>
          <span class="d-block px-3 py-2">Sign-in content</span>
        </BsAccordionItem>
      </BsAccordion>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

<style scoped>
/* The chrome lives in the web component's shadow root, so page CSS reaches it
   through Bootstrap's custom properties and the exposed parts. */
.multi-level {
  --bs-accordion-btn-bg: #333;
  --bs-accordion-btn-color: #fff;
  --bs-accordion-active-bg: #444;
  --bs-accordion-active-color: #fff;
}

.multi-level::part(content) {
  background-color: #ccc;
}
</style>
