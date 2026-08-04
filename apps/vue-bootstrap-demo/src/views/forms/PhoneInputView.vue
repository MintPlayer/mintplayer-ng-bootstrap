<script setup lang="ts">
import { ref } from 'vue';
import { BsPhoneInput } from '@mintplayer/vue-bootstrap/phone-input';
import { BsInputGroup } from '@mintplayer/vue-bootstrap/input-group';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { PhoneChangeEventDetail } from '@mintplayer/web-components/phone-input';

// v-model is the E.164 string, or null while empty.
const phone = ref<string | null>(null);
const detail = ref<PhoneChangeEventDetail | null>(null);
const locale = ref('');

const SOURCE = `<BsPhoneInput
  v-model="phone"
  default-country="be"
  input-label="Phone number"
  @phone-change="detail = $event"
/>`;

const GROUP_SOURCE = `<!-- The group joins controls that keep their own shadow
     root, which Bootstrap's own CSS cannot reach. -->
<BsInputGroup>
  <span class="addon">Tel</span>
  <BsPhoneInput default-country="be" />
</BsInputGroup>`;
</script>

<template>
  <div class="demo-page">
    <h1>Phone input</h1>
    <p class="text-body-secondary">
      A country picker with flags, a dial code that cannot be edited away, and
      as-you-type formatting. <code>v-model</code> is <strong>E.164</strong> —
      <code>+32470123456</code> — or <code>null</code> while empty. Validation
      rules load per calling code on first interaction, so nothing downloads until
      the user reaches the field, and <code>valid</code> is <code>undefined</code>
      until they arrive.
    </p>

    <section data-demo="basic">
      <h2>Basic usage</h2>
      <BsPhoneInput
        v-model="phone"
        default-country="be"
        input-label="Phone number"
        :locale="locale || undefined"
        @phone-change="detail = $event"
      />
      <p class="mt-2 mb-1">Value: <code>{{ phone ?? 'null' }}</code></p>
      <pre class="text-start"><code>{{ detail ? JSON.stringify(detail, null, 2) : '—' }}</code></pre>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>

    <section data-demo="locale">
      <h2>Localized country names</h2>
      <p class="text-body-secondary">
        Names come from <code>Intl.DisplayNames</code> and are collated in the
        viewer's language at no download cost. Switch and reopen the picker — the
        order changes, because an alphabetical list of English names is not
        alphabetical to a Dutch reader.
      </p>
      <select v-model="locale" aria-label="Locale" class="form-select">
        <option value="">Browser locale</option>
        <option value="en-US">en-US</option>
        <option value="nl-BE">nl-BE</option>
        <option value="fr-FR">fr-FR</option>
        <option value="ja-JP">ja-JP</option>
      </select>
    </section>

    <section data-demo="restricted">
      <h2>Restricting and pinning countries</h2>
      <BsPhoneInput
        default-country="nl"
        allowed-countries="be,nl,lu"
        preferred-countries="nl"
        input-label="Benelux phone number"
      />
    </section>

    <section data-demo="group">
      <h2>Inside an input group</h2>
      <BsInputGroup>
        <span class="addon">Tel</span>
        <BsPhoneInput default-country="be" input-label="Phone number" />
      </BsInputGroup>
      <BsCodeSnippet :code="GROUP_SOURCE" language="html" />
    </section>
  </div>
</template>
