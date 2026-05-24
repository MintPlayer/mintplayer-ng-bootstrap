<script setup lang="ts">
import { computed, ref } from 'vue';
import { BsSelect } from '@mintplayer/vue-bootstrap/select';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

interface Dish {
  id: number;
  name: string;
}

const DISHES: Dish[] = [
  { id: 1, name: 'Salmon' },
  { id: 2, name: 'Spaghetti' },
  { id: 3, name: 'Lasagna' },
];

// `<mp-select>`'s value-space is string only. We bind `selectedId` (a
// stringified Dish.id) via `v-model` and derive the full object via a
// computed — same pattern the Angular wrapper hides behind its
// `BsSelectValueAccessor` optionMap.
const selectedId = ref<string | null>('');
const selected = computed(() =>
  DISHES.find((d) => String(d.id) === selectedId.value) ?? null,
);

const size = ref<'sm' | 'md' | 'lg'>('md');

const SOURCE = `<BsSelect v-model="selectedId">
  <option value="">Choose a dish</option>
  <option v-for="d in DISHES" :key="d.id" :value="String(d.id)">{{ d.name }}</option>
</BsSelect>`;
</script>

<template>
  <div class="demo-page">
    <h1>Select</h1>
    <p class="text-body-secondary">
      A Bootstrap-styled <code>&lt;select&gt;</code> wrapped as a web
      component. Project <code>&lt;option&gt;</code> children declaratively
      — the WC mirrors them into its shadow <code>&lt;select&gt;</code>.
      Bind the string value with <code>v-model</code>.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsSelect v-model="selectedId">
        <option value="">Choose a dish</option>
        <option v-for="d in DISHES" :key="d.id" :value="String(d.id)">{{ d.name }}</option>
      </BsSelect>
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ JSON.stringify(selected) }}</code>
      </p>
    </section>

    <section>
      <h2>Size variants</h2>
      <div class="d-flex gap-2 mb-2">
        <label v-for="s in (['sm','md','lg'] as const)" :key="s" class="form-check form-check-inline">
          <input type="radio" class="form-check-input" name="size" :value="s" v-model="size" />
          <span class="form-check-label">{{ s }}</span>
        </label>
      </div>
      <BsSelect :size="size" aria-label="Sized example">
        <option value="">Pick one</option>
        <option value="a">Apple</option>
        <option value="b">Banana</option>
        <option value="c">Cherry</option>
      </BsSelect>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
