<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  BsTimeline,
  BsTimelineItem,
  type TimelineAlign,
  type TimelineItem,
  type TimelineOrientation,
  type TimelineSelectable,
} from '@mintplayer/vue-bootstrap/timeline';
import { BsCheckbox } from '@mintplayer/vue-bootstrap/checkbox';
import { BsSelect } from '@mintplayer/vue-bootstrap/select';
import { BsCard, BsCardHeader, BsCardBody, BsCardText, BsCardFooter } from '@mintplayer/vue-bootstrap/card';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const milestones: TimelineItem[] = [
  { id: 'kickoff', title: 'Kickoff',         description: 'Project scoping and team assembly.', time: '2026-01-10', icon: 'bi bi-flag',           color: '#6c757d' },
  { id: 'design',  title: 'Design approved', description: 'PRD signed off after design review.', time: '2026-02-02', icon: 'bi bi-pencil-square',  color: '#0d6efd' },
  { id: 'beta',    title: 'Beta',            description: 'Closed beta with 50 testers.',        time: '2026-04-15', icon: 'bi bi-flask',         color: '#fd7e14' },
  { id: 'ship',    title: 'Shipped v1',      description: 'First public release.',                time: '2026-05-01', icon: 'bi bi-rocket-takeoff', color: '#198754' },
];

// Playground controls — one <BsSelect> / <BsCheckbox> per input.
const orientation = ref<TimelineOrientation>('vertical');
const align = ref<TimelineAlign>('start');
const selectable = ref<TimelineSelectable>('none');
const reverse = ref(false);
const customMarkers = ref(false);
const cardContent = ref(false);
const selected = ref<TimelineItem[]>([]);

// <BsSelect> takes a JS `options` array of { value, label }.
const orientationOptions = (['vertical', 'horizontal'] as const).map((v) => ({ value: v, label: v }));
const alignOptions = (['start', 'end', 'alternate', 'alternate-reverse'] as const).map((v) => ({ value: v, label: v }));
const selectableOptions = (['none', 'single', 'multiple'] as const).map((v) => ({ value: v, label: v }));

const selectedTitles = computed(() => selected.value.map((m) => m.title ?? '(untitled)'));

// Keep the copyable snippet in sync with the live controls.
const playgroundSource = computed(() => {
  const attrs = [':items="milestones"'];
  if (orientation.value !== 'vertical') attrs.push(`orientation="${orientation.value}"`);
  if (align.value !== 'start') attrs.push(`align="${align.value}"`);
  if (reverse.value) attrs.push(':reverse="true"');
  if (selectable.value !== 'none') {
    attrs.push(`selectable="${selectable.value}"`);
    attrs.push('v-model:selection="selected"');
  }

  const slots: string[] = [];
  if (customMarkers.value) {
    slots.push(
      '  <template #marker="{ item }">',
      '    <span class="timeline-dot" :class="`timeline-dot--${item.id}`"><i :class="item.icon"></i></span>',
      '  </template>',
    );
  }
  if (cardContent.value) {
    slots.push(
      '  <template #content="{ item }">',
      '    <BsCard>',
      '      <BsCardHeader>{{ item.title }}</BsCardHeader>',
      '      <BsCardBody>',
      '        <BsCardText class="small text-body-secondary mb-0">{{ item.description }}</BsCardText>',
      '      </BsCardBody>',
      '      <BsCardFooter><small class="text-body-secondary">{{ item.time }}</small></BsCardFooter>',
      '    </BsCard>',
      '  </template>',
    );
  }

  const attrBlock = attrs.length === 1 ? attrs[0] : `\n  ${attrs.join('\n  ')}\n`;
  if (!slots.length) {
    return attrs.length === 1 ? `<BsTimeline ${attrs[0]} />` : `<BsTimeline${attrBlock}/>`;
  }
  const openTag = attrs.length === 1 ? `<BsTimeline ${attrs[0]}>` : `<BsTimeline${attrBlock}>`;
  return `${openTag}\n${slots.join('\n')}\n</BsTimeline>`;
});

const DECLARATIVE_SOURCE = `<BsTimeline align="alternate">
  <BsTimelineItem item-id="kickoff" color="#6c757d">
    <BsCard slot="content">
      <BsCardHeader>Kickoff</BsCardHeader>
      <BsCardBody>
        <BsCardText class="small text-body-secondary mb-0">Project scoping and team assembly.</BsCardText>
      </BsCardBody>
      <BsCardFooter><small class="text-body-secondary">2026-01-10</small></BsCardFooter>
    </BsCard>
    <small slot="opposite" class="text-body-secondary">2026-01-10</small>
  </BsTimelineItem>
  <BsTimelineItem item-id="ship" color="#198754">
    <BsCard slot="content">
      <BsCardHeader>Shipped v1</BsCardHeader>
      <BsCardBody>
        <BsCardText class="small text-body-secondary mb-0">First public release.</BsCardText>
      </BsCardBody>
      <BsCardFooter><small class="text-body-secondary">2026-05-01</small></BsCardFooter>
    </BsCard>
    <small slot="opposite" class="text-body-secondary">2026-05-01</small>
  </BsTimelineItem>
</BsTimeline>`;
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
      <h2>Playground</h2>
      <p class="text-body-secondary">
        Toggle each input with a <code>&lt;BsSelect&gt;</code> or
        <code>&lt;BsCheckbox&gt;</code> and watch the single live timeline — and
        the copyable snippet beneath it — update to match.
      </p>

      <div class="playground-controls">
        <div class="control-field">
          <label class="form-label mb-1">Orientation</label>
          <BsSelect
            :model-value="orientation"
            :options="orientationOptions"
            @update:model-value="orientation = $event as TimelineOrientation"
          />
        </div>

        <div class="control-field">
          <label class="form-label mb-1">Alignment</label>
          <BsSelect
            :model-value="align"
            :options="alignOptions"
            @update:model-value="align = $event as TimelineAlign"
          />
        </div>

        <div class="control-field">
          <label class="form-label mb-1">Selectable</label>
          <BsSelect
            :model-value="selectable"
            :options="selectableOptions"
            @update:model-value="selectable = $event as TimelineSelectable"
          />
        </div>

        <div class="control-toggles">
          <BsCheckbox type="switch" v-model="reverse">Reverse</BsCheckbox>
          <BsCheckbox type="switch" v-model="customMarkers">Custom markers</BsCheckbox>
          <BsCheckbox type="switch" v-model="cardContent">Card content</BsCheckbox>
        </div>
      </div>

      <BsTimeline
        :items="milestones"
        :orientation="orientation"
        :align="align"
        :reverse="reverse"
        :selectable="selectable"
        v-model:selection="selected"
      >
        <template v-if="customMarkers" #marker="{ item }">
          <span class="timeline-dot" :class="`timeline-dot--${item.id}`">
            <i :class="item.icon"></i>
          </span>
        </template>
        <template v-if="cardContent" #content="{ item }">
          <BsCard>
            <BsCardHeader>{{ item.title }}</BsCardHeader>
            <BsCardBody>
              <BsCardText class="small text-body-secondary mb-0">{{ item.description }}</BsCardText>
            </BsCardBody>
            <BsCardFooter><small class="text-body-secondary">{{ item.time }}</small></BsCardFooter>
          </BsCard>
        </template>
      </BsTimeline>

      <div v-if="selectable !== 'none'" class="mt-3">
        <strong>Selected:</strong>
        <span v-if="!selectedTitles.length" class="text-body-secondary"> none</span>
        <span v-else> {{ selectedTitles.join(', ') }}</span>
      </div>

      <BsCodeSnippet :code="playgroundSource" language="html" />
    </section>

    <section>
      <h2>Declarative authoring</h2>
      <p class="text-body-secondary">
        Instead of binding <code>:items</code>, drop
        <code>&lt;BsTimelineItem&gt;</code> children directly inside
        <code>&lt;BsTimeline&gt;</code> and project into the named slots. Handy
        when each item's markup is bespoke rather than uniform.
      </p>
      <BsTimeline align="alternate">
        <BsTimelineItem item-id="kickoff" color="#6c757d">
          <BsCard slot="content">
            <BsCardHeader>Kickoff</BsCardHeader>
            <BsCardBody>
              <BsCardText class="small text-body-secondary mb-0">Project scoping and team assembly.</BsCardText>
            </BsCardBody>
            <BsCardFooter><small class="text-body-secondary">2026-01-10</small></BsCardFooter>
          </BsCard>
          <small slot="opposite" class="text-body-secondary">2026-01-10</small>
        </BsTimelineItem>
        <BsTimelineItem item-id="ship" color="#198754">
          <BsCard slot="content">
            <BsCardHeader>Shipped v1</BsCardHeader>
            <BsCardBody>
              <BsCardText class="small text-body-secondary mb-0">First public release.</BsCardText>
            </BsCardBody>
            <BsCardFooter><small class="text-body-secondary">2026-05-01</small></BsCardFooter>
          </BsCard>
          <small slot="opposite" class="text-body-secondary">2026-05-01</small>
        </BsTimelineItem>
      </BsTimeline>
      <BsCodeSnippet :code="DECLARATIVE_SOURCE" language="html" />
    </section>
  </div>
</template>

<style scoped>
.playground-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.control-field {
  display: flex;
  flex-direction: column;
  min-width: 12rem;
}

.control-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

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
