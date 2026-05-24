<script setup lang="ts">
import { ref } from 'vue';
import { BsRibbon } from '@mintplayer/vue-bootstrap/ribbon';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const activeTab = ref<string | null>('home');
const bold = ref(false);
const wrap = ref(false);
const log = ref<string[]>([]);

function append(msg: string) {
  log.value = [msg, ...log.value].slice(0, 8);
}

const SOURCE = `<BsRibbon v-model="activeTab">
  <mp-ribbon-tab tab-id="home" label="Home">
    <mp-ribbon-group label="Clipboard">
      <mp-ribbon-button item-id="paste" label="Paste" />
      <mp-ribbon-button item-id="cut"   label="Cut" />
      <mp-ribbon-button item-id="copy"  label="Copy" />
    </mp-ribbon-group>
    <mp-ribbon-group label="Font">
      <mp-ribbon-toggle-button item-id="bold" label="Bold" />
      <mp-ribbon-checkbox item-id="wrap" label="Word wrap" />
    </mp-ribbon-group>
  </mp-ribbon-tab>
</BsRibbon>`;
</script>

<template>
  <div class="demo-page">
    <h1>Ribbon</h1>
    <p class="text-body-secondary">
      Office-style ribbon with tabs, groups, and a 14-element item
      vocabulary (buttons, split/dropdown buttons, toggle, checkbox,
      combobox, color picker, gallery, ...). Item events bubble as
      CustomEvents — Vue listens with the standard <code>@event-name</code>
      syntax directly on the custom element.
    </p>

    <section>
      <BsRibbon v-model="activeTab">
        <mp-ribbon-tab tab-id="home" label="Home">
          <mp-ribbon-group label="Clipboard">
            <mp-ribbon-button item-id="paste" label="Paste" @item-click="append('paste')" />
            <mp-ribbon-button item-id="cut"   label="Cut"   @item-click="append('cut')" />
            <mp-ribbon-button item-id="copy"  label="Copy"  @item-click="append('copy')" />
          </mp-ribbon-group>
          <mp-ribbon-group label="Font">
            <mp-ribbon-toggle-button
              item-id="bold"
              label="Bold"
              :pressed="bold"
              @toggle="(e: CustomEvent<{ pressed: boolean }>) => bold = e.detail.pressed"
            />
            <mp-ribbon-checkbox
              item-id="wrap"
              label="Word wrap"
              :checked="wrap"
              @check-change="(e: CustomEvent<{ checked: boolean }>) => wrap = e.detail.checked"
            />
          </mp-ribbon-group>
        </mp-ribbon-tab>
      </BsRibbon>
      <p class="text-body-secondary mt-2">
        Bold: <code>{{ bold }}</code> · Wrap: <code>{{ wrap }}</code>
        · Log: <code>{{ log.length ? log.join(' → ') : '—' }}</code>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
