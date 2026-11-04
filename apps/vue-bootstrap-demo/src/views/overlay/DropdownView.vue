<script setup lang="ts">
import { ref } from 'vue';
import type { DropdownSelectEventDetail } from '@mintplayer/ui-core/dropdown';
import { BsDropdown, BsDropdownDivider, BsDropdownHeader, BsDropdownItem, BsDropdownMenu } from '@mintplayer/vue-bootstrap/dropdown';
import { BsCalendar } from '@mintplayer/vue-bootstrap/calendar';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const chosen = ref<string | null>(null);
const choose = ({ value }: DropdownSelectEventDetail) => (chosen.value = String(value));

const SOURCE = `<BsDropdown>
  <template #default="{ props }">
    <button type="button" class="btn btn-primary" v-bind="props">Actions</button>
  </template>
  <template #content>
    <BsDropdownMenu @item-select="({ value }) => (chosen = value)">
      <BsDropdownHeader>File</BsDropdownHeader>
      <BsDropdownItem value="new">New</BsDropdownItem>
      <BsDropdownItem value="save" disabled>Save</BsDropdownItem>
      <BsDropdownDivider />
      <BsDropdownItem><a href="https://getbootstrap.com">Bootstrap</a></BsDropdownItem>
    </BsDropdownMenu>
  </template>
</BsDropdown>`;
</script>

<template>
  <div class="demo-page">
    <h1>Dropdown</h1>
    <p class="text-body-secondary">
      <code>BsDropdown</code> renders nothing itself: bind its <code>props</code> on the trigger, and its
      <code>content</code> slot opens at the end of <code>&lt;body&gt;</code>. The trigger is a menu button: a click
      toggles it, ArrowDown and ArrowUp open it on the first and the last item. Escape, a click outside, tabbing out
      or choosing an item closes it, and focus returns to the trigger. <code>placement</code> is
      <code>bottom-start</code> (the default), <code>bottom-end</code>, <code>top-start</code> or
      <code>top-end</code>; it flips when there is no room.
    </p>

    <section>
      <h2>Menu</h2>
      <div class="d-flex gap-2 overflow-hidden">
        <BsDropdown>
          <template #default="{ props }">
            <button type="button" class="btn btn-primary" v-bind="props">Actions</button>
          </template>
          <template #content>
            <BsDropdownMenu @item-select="choose">
              <BsDropdownHeader>File</BsDropdownHeader>
              <BsDropdownItem value="new">New</BsDropdownItem>
              <BsDropdownItem value="open">Open…</BsDropdownItem>
              <BsDropdownItem value="save" disabled>Save</BsDropdownItem>
              <BsDropdownDivider />
              <BsDropdownItem>
                <a href="https://getbootstrap.com/docs/5.3/components/dropdowns/" target="_blank" rel="noopener noreferrer">Bootstrap docs</a>
              </BsDropdownItem>
            </BsDropdownMenu>
          </template>
        </BsDropdown>
        <BsDropdown placement="bottom-end" same-width>
          <template #default="{ props }">
            <button type="button" class="btn btn-secondary" v-bind="props">Aligned to the end</button>
          </template>
          <template #content>
            <BsDropdownMenu>
              <BsDropdownItem>One</BsDropdownItem>
              <BsDropdownItem>Two</BsDropdownItem>
              <BsDropdownItem>Three</BsDropdownItem>
            </BsDropdownMenu>
          </template>
        </BsDropdown>
      </div>
      <p class="mt-2" data-testid="chosen">Chosen: {{ chosen ?? 'nothing yet' }}</p>
    </section>

    <section>
      <h2>Any content</h2>
      <p class="text-body-secondary">
        With <code>has-popup="dialog"</code> the panel holds content that is not a menu and takes focus itself.
      </p>
      <BsDropdown has-popup="dialog">
        <template #default="{ props }">
          <button type="button" class="btn btn-primary" v-bind="props">Pick a date</button>
        </template>
        <template #content><BsCalendar /></template>
      </BsDropdown>
    </section>

    <section>
      <h2>A menu in place</h2>
      <p class="text-body-secondary"><code>BsDropdownMenu</code> works on its own too; give it a <code>label</code>.</p>
      <BsDropdownMenu label="Formatting" class="d-inline-block">
        <BsDropdownItem active>Bold</BsDropdownItem>
        <BsDropdownItem>Italic</BsDropdownItem>
        <BsDropdownItem>Underline</BsDropdownItem>
      </BsDropdownMenu>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
