<script setup lang="ts">
// Side-effect-registers <mp-phone-input> (and the WCs it composes).
import '@mintplayer/web-components/phone-input';
import type {
  CountryChangeEventDetail,
  MpPhoneInput,
  PhoneChangeEventDetail,
} from '@mintplayer/web-components/phone-input';
import { onMounted, ref, watch } from 'vue';
defineOptions({ inheritAttrs: false });

/**
 * `v-model` is the **E.164** string (`'+32470123456'`), or null while empty.
 *
 * Everything else — `country`, `default-country`, `locale`,
 * `preferred-countries`, `allowed-countries`, `placeholder`, `required`,
 * `disabled`, `input-label`, `country-label`, `error-text` — rides `$attrs` as
 * plain attributes, so no prop declarations are needed for them.
 */
const modelValue = defineModel<string | null>();

const emit = defineEmits<{
  phoneChange: [detail: PhoneChangeEventDetail];
  countryChange: [country: string];
}>();

const el = ref<MpPhoneInput | null>(null);

// `value` is a property, not an attribute (it changes per keystroke and the
// element derives it from country + digits), so v-model has to be pushed
// through the element reference.
function syncValue() {
  if (el.value) el.value.value = modelValue.value ?? null;
}

onMounted(syncValue);
watch(modelValue, syncValue);

function onValueChange(e: Event) {
  const detail = (e as CustomEvent<PhoneChangeEventDetail>).detail;
  if (!detail) return;
  modelValue.value = detail.value;
  emit('phoneChange', detail);
}

function onCountryChange(e: Event) {
  const detail = (e as CustomEvent<CountryChangeEventDetail>).detail;
  if (detail) emit('countryChange', detail.country);
}
</script>

<template>
  <mp-phone-input
    ref="el"
    v-bind="$attrs"
    @value-change="onValueChange"
    @country-change="onCountryChange"
  />
</template>
