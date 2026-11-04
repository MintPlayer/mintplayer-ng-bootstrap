<script setup lang="ts">
import { ref } from 'vue';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import { BsPriorityNav, type PriorityNavItem } from '@mintplayer/vue-bootstrap/priority-nav';

const links: PriorityNavItem[] = [
  { key: 'home',     label: 'Home',     href: '#', priority: 1, hideBelow: 'sm' },
  { key: 'products', label: 'Products', href: '#', priority: 2, hideBelow: 'md' },
  { key: 'services', label: 'Services', href: '#', priority: 3, hideBelow: 'md' },
  { key: 'pricing',  label: 'Pricing',  href: '#', priority: 4, hideBelow: 'lg' },
  { key: 'blog',     label: 'Blog',     href: '#', priority: 5, hideBelow: 'lg' },
  { key: 'careers',  label: 'Careers',  href: '#', priority: 6, hideBelow: 'xl' },
  { key: 'support',  label: 'Support',  href: '#', priority: 7, hideBelow: 'xl' },
  { key: 'contact',  label: 'Contact',  href: '#', priority: 8, hideBelow: 'xl' },
];

const actions: PriorityNavItem[] = ['Edit', 'Duplicate', 'Delete'].map((label) => ({ key: label, label, priority: 1 }));
const lastAction = ref<string | null>(null);

const SOURCE = `<BsPriorityNav :items="links" />`;

const ACTIONS_SOURCE = `<BsPriorityNav collapse-at="sm" :items="actions">
  <template #itemTemplate="{ item }">
    <button type="button" class="btn btn-sm btn-outline-secondary" @click="run(item)">{{ item.label }}</button>
  </template>
</BsPriorityNav>`;
</script>

<template>
  <div class="demo-page">
    <h1>Priority navigation</h1>
    <p class="text-body-secondary">
      <code>BsPriorityNav</code> keeps as many <code>items</code> visible as fit and moves the rest, highest
      <code>priority</code> first, into a "More" disclosure. Without JavaScript each item's <code>hideBelow</code>
      breakpoint decides, and More is a checkbox toggle. <kbd>Escape</kbd> closes the overflow and returns focus to
      More.
    </p>

    <section>
      <h2>Basic usage</h2>
      <div class="p-2 border rounded">
        <BsPriorityNav :items="links" />
      </div>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>

    <section>
      <h2>Actions in the overflow</h2>
      <p>Below <code>sm</code> every action moves into More. Activating one closes More and returns focus to it.</p>
      <div class="p-2 border rounded">
        <BsPriorityNav collapse-at="sm" :items="actions" label="Record actions">
          <template #itemTemplate="{ item }">
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="lastAction = String(item.label)">{{ item.label }}</button>
          </template>
        </BsPriorityNav>
      </div>
      <p v-if="lastAction" class="text-body-secondary small">Last action: {{ lastAction }}</p>
      <BsCodeSnippet :code="ACTIONS_SOURCE" language="html" />
    </section>
  </div>
</template>
