<script setup lang="ts">
import { ref } from 'vue';
import { BsTimeline, BsTimelineItem, type TimelineItem } from '@mintplayer/vue-bootstrap/timeline';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const milestones: TimelineItem[] = [
  { id: 'kickoff', title: 'Kickoff',         description: 'Project scoping and team assembly.', time: '2026-01-10', icon: 'bi bi-flag',           color: '#6c757d' },
  { id: 'design',  title: 'Design approved', description: 'PRD signed off after design review.', time: '2026-02-02', icon: 'bi bi-pencil-square',  color: '#0d6efd' },
  { id: 'beta',    title: 'Beta',            description: 'Closed beta with 50 testers.',        time: '2026-04-15', icon: 'bi bi-flask',         color: '#fd7e14' },
  { id: 'ship',    title: 'Shipped v1',      description: 'First public release.',                time: '2026-05-01', icon: 'bi bi-rocket-takeoff', color: '#198754' },
];

// Section 4 — reverse toggle.
const reverse = ref(false);

// Section 7 — two-way bound selection.
const selected = ref<TimelineItem[]>([]);

const BASIC_SOURCE = `<BsTimeline :items="milestones" />`;

const HORIZONTAL_SOURCE = `<BsTimeline :items="milestones" orientation="horizontal" />`;

const ALTERNATE_SOURCE = `<BsTimeline :items="milestones" align="alternate" />`;

const REVERSE_SOURCE = `<button class="btn btn-outline-primary btn-sm mb-3" @click="reverse = !reverse">
  Toggle reverse
</button>

<BsTimeline :items="milestones" :reverse="reverse" />`;

const MARKER_SOURCE = `<BsTimeline :items="milestones">
  <template #marker="{ item }">
    <span class="timeline-dot" :style="{ backgroundColor: item.color }">
      <i :class="item.icon"></i>
    </span>
  </template>
</BsTimeline>`;

const CARD_SOURCE = `<!-- render-prop / scoped slot -->
<BsTimeline :items="milestones" align="alternate">
  <template #content="{ item }">
    <div class="card">
      <div class="card-body">
        <h6 class="card-title mb-1">{{ item.title }}</h6>
        <p class="card-text small text-body-secondary mb-0">{{ item.description }}</p>
      </div>
    </div>
  </template>
  <template #timestamp="{ item }">
    <small class="text-body-secondary">{{ item.time }}</small>
  </template>
</BsTimeline>

<!-- declarative child elements -->
<BsTimeline align="alternate">
  <BsTimelineItem item-id="kickoff" color="#6c757d">
    <div slot="content" class="card">
      <div class="card-body">
        <h6 class="card-title mb-1">Kickoff</h6>
        <p class="card-text small text-body-secondary mb-0">Project scoping and team assembly.</p>
      </div>
    </div>
    <small slot="opposite" class="text-body-secondary">2026-01-10</small>
  </BsTimelineItem>
  <BsTimelineItem item-id="ship" color="#198754">
    <div slot="content" class="card">
      <div class="card-body">
        <h6 class="card-title mb-1">Shipped v1</h6>
        <p class="card-text small text-body-secondary mb-0">First public release.</p>
      </div>
    </div>
    <small slot="opposite" class="text-body-secondary">2026-05-01</small>
  </BsTimelineItem>
</BsTimeline>`;

const SELECTABLE_SOURCE = `<BsTimeline
  :items="milestones"
  selectable="multiple"
  v-model:selection="selected"
/>

<!-- selected is a TimelineItem[] kept in sync both ways -->
<ul>
  <li v-for="item in selected" :key="item.id">{{ item.title }}</li>
</ul>`;
</script>

<template>
  <div class="demo-page">
    <h1>Timeline</h1>
    <p class="text-body-secondary">
      Vertical / horizontal sequence of events. Bind an <code>:items</code>
      array for the built-in row layout (marker + title + description, with the
      timestamp opposite the line), or author items declaratively with
      <code>&lt;BsTimelineItem&gt;</code> and per-region slots. Customise any
      region with a scoped slot, opt into selection with
      <code>selectable</code>, and flip render order with <code>reverse</code>.
    </p>

    <section>
      <h2>Basic vertical</h2>
      <BsTimeline :items="milestones" />
      <BsCodeSnippet :code="BASIC_SOURCE" language="html" />
    </section>

    <section>
      <h2>Horizontal</h2>
      <BsTimeline :items="milestones" orientation="horizontal" />
      <BsCodeSnippet :code="HORIZONTAL_SOURCE" language="html" />
    </section>

    <section>
      <h2>Alternate alignment</h2>
      <BsTimeline :items="milestones" align="alternate" />
      <BsCodeSnippet :code="ALTERNATE_SOURCE" language="html" />
    </section>

    <section>
      <h2>Reverse</h2>
      <button class="btn btn-outline-primary btn-sm mb-3" @click="reverse = !reverse">
        Toggle reverse ({{ reverse ? 'on' : 'off' }})
      </button>
      <BsTimeline :items="milestones" :reverse="reverse" />
      <BsCodeSnippet :code="REVERSE_SOURCE" language="html" />
    </section>

    <section>
      <h2>Custom markers + colors</h2>
      <BsTimeline :items="milestones">
        <template #marker="{ item }">
          <span class="timeline-dot" :class="`timeline-dot--${item.id}`">
            <i :class="item.icon"></i>
          </span>
        </template>
      </BsTimeline>
      <BsCodeSnippet :code="MARKER_SOURCE" language="html" />
    </section>

    <section>
      <h2>Connected card (headline)</h2>
      <p class="text-body-secondary">Scoped-slot render prop:</p>
      <BsTimeline :items="milestones" align="alternate">
        <template #content="{ item }">
          <div class="card">
            <div class="card-body">
              <h6 class="card-title mb-1">{{ item.title }}</h6>
              <p class="card-text small text-body-secondary mb-0">{{ item.description }}</p>
            </div>
          </div>
        </template>
        <template #timestamp="{ item }">
          <small class="text-body-secondary">{{ item.time }}</small>
        </template>
      </BsTimeline>

      <p class="text-body-secondary mt-4">Declarative child elements:</p>
      <BsTimeline align="alternate">
        <BsTimelineItem item-id="kickoff" color="#6c757d">
          <div slot="content" class="card">
            <div class="card-body">
              <h6 class="card-title mb-1">Kickoff</h6>
              <p class="card-text small text-body-secondary mb-0">Project scoping and team assembly.</p>
            </div>
          </div>
          <small slot="opposite" class="text-body-secondary">2026-01-10</small>
        </BsTimelineItem>
        <BsTimelineItem item-id="ship" color="#198754">
          <div slot="content" class="card">
            <div class="card-body">
              <h6 class="card-title mb-1">Shipped v1</h6>
              <p class="card-text small text-body-secondary mb-0">First public release.</p>
            </div>
          </div>
          <small slot="opposite" class="text-body-secondary">2026-05-01</small>
        </BsTimelineItem>
      </BsTimeline>
      <BsCodeSnippet :code="CARD_SOURCE" language="html" />
    </section>

    <section>
      <h2>Selectable</h2>
      <BsTimeline
        :items="milestones"
        selectable="multiple"
        v-model:selection="selected"
      />
      <div class="mt-3">
        <strong>Selected:</strong>
        <span v-if="!selected.length" class="text-body-secondary"> none</span>
        <ul v-else class="mb-0">
          <li v-for="item in selected" :key="item.id">{{ item.title }}</li>
        </ul>
      </div>
      <BsCodeSnippet :code="SELECTABLE_SOURCE" language="html" />
    </section>
  </div>
</template>

<style scoped>
.timeline-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: #fff;
}

.timeline-dot--kickoff { background-color: #6c757d; }
.timeline-dot--design  { background-color: #0d6efd; }
.timeline-dot--beta    { background-color: #fd7e14; }
.timeline-dot--ship    { background-color: #198754; }
</style>
