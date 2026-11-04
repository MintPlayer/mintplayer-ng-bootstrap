import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The color picker's manifest (#458 M7): `bs-color-picker` (Angular, a ControlValueAccessor of
 * the hex), `BsColorPicker` (React, Vue `v-model:value`) and `mp-color-picker` (Lit).
 */
export default {
  group: 'color-picker',
  style: { scope: 'color-picker', bootstrap: ['forms'] },
  components: {
    'color-picker': {
      core: 'colorPickerCore',
      doc: 'A hue/saturation wheel over brightness and alpha sliders, with an optional pair of hue and saturation sliders. `value` (hex), `alpha` and `channelSlidersVisible` are two-way.',
      inputs: {
        type: 'ColorPickerInputs',
        fields: {
          value: { default: "'#ffffff'", kind: 'string', model: true },
          alpha: { default: '1', kind: 'number', model: true },
          channelSlidersVisible: { default: 'false', model: true },
          size: { default: '150', kind: 'number', doc: "The wheel's diameter and the sliders' width, in pixels." },
          allowAlpha: { default: 'true' },
          showAccessibilityToggle: { default: 'true', doc: 'Renders the switch that reveals the hue and saturation sliders.' },
          disabled: { default: 'false', reflect: true },
          labels: { default: 'null', kind: false, doc: 'Localized accessible names; missing keys keep the English defaults.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
