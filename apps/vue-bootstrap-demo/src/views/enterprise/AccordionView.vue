<script setup lang="ts">
import { ref } from 'vue';
import { BsAccordion, BsAccordionItem } from '@mintplayer/vue-bootstrap/accordion';
import type { AccordionTabToggle } from '@mintplayer/vue-bootstrap/accordion';
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

function onToggle({ index, active }: AccordionTabToggle) {
  lastToggle.value = `tab ${index} → ${active ? 'open' : 'closed'}`;
}
</script>

<template>
  <div class="demo-page">
    <h1>Accordion</h1>
    <p>
      <code>BsAccordion</code> renders Bootstrap's accordion markup itself, from the
      framework-neutral <code>@mintplayer/ui-core/accordion</code> core. Each
      <code>BsAccordionItem</code> is one row: its <code>#header</code> slot goes in the row's
      summary, its default slot in the collapsible region.
    </p>
    <p>
      The accordion is built on native <code>&lt;details name&gt;</code> / <code>&lt;summary&gt;</code>,
      so it stays fully interactive with JavaScript disabled — single-open exclusivity included —
      and a closed tab's content is removed from the tab order and the accessibility tree by
      the browser itself.
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
/* Bootstrap declares the --bs-accordion-* properties on every .accordion,
   in a lower cascade layer than page CSS, so a plain rule on the accordion
   wins — and a nested accordion needs its own rule, or it re-declares the
   defaults. */
.multi-level,
.multi-level .accordion {
  --bs-accordion-btn-bg: #333;
  --bs-accordion-btn-color: #fff;
  --bs-accordion-active-bg: #444;
  --bs-accordion-active-color: #fff;
  --bs-accordion-border-width: 0;
}

/* Each nesting level gets a lighter header. */
.multi-level .accordion {
  --bs-accordion-btn-bg: #666;
}

.multi-level .accordion .accordion {
  --bs-accordion-btn-bg: #999;
}

.multi-level :deep(.accordion-content) {
  background-color: var(--bs-secondary-bg);
}
</style>
