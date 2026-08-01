<script setup lang="ts">
import { ref } from 'vue';
import { BsDatetimePicker } from '@mintplayer/vue-bootstrap/datetime-picker';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const dt = ref<Date | null>(null);
const bounded = ref<Date | null>(null);

// Deliberately carrying a time: these bound the datetime, and on their own day
// the time list narrows to match. A bare `new Date(2026, 11, 31)` is midnight.
const boundsMin = new Date(2026, 0, 1, 9, 0);
const boundsMax = new Date(2026, 11, 31, 17, 0);

const SOURCE = `<BsDatetimePicker v-model="dt" />`;

const BOUNDS_SOURCE = `<script setup>
const boundsMin = new Date(2026, 0, 1, 9, 0);
const boundsMax = new Date(2026, 11, 31, 17, 0);
<\/script>

<BsDatetimePicker v-model="bounded" :min="boundsMin" :max="boundsMax" show-clear />`;
</script>

<template>
  <div class="demo-page">
    <h1>Datetime picker</h1>
    <p class="text-body-secondary">
      Single readonly input with two popups — a calendar for the date,
      a time list for the hour/minute. Both share one <code>Date</code>
      value.
    </p>

    <section>
      <h2>Default</h2>
      <BsDatetimePicker v-model="dt" />
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ dt ? dt.toISOString() : '—' }}</code>
      </p>
    </section>

    <section>
      <h2>min / max bounds</h2>
      <p class="text-body-secondary">
        Bounded to 2026, 09:00 on 1 January through 17:00 on 31 December.
        Pick either bound's own day to see the time list narrow with it — any
        other day keeps all 24 hours.
      </p>
      <BsDatetimePicker v-model="bounded" :min="boundsMin" :max="boundsMax" show-clear />
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ bounded ? bounded.toISOString() : '—' }}</code>
      </p>
      <BsCodeSnippet :code="BOUNDS_SOURCE" language="html" />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
