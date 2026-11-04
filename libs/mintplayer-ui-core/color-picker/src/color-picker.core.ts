import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { hydratedAttr } from '@mintplayer/ui-core/store';
import { hex2hsv, hex2rgb, hs2polar, hsv2rgb, polar2hs, rgb2hex, type RgbColor } from './color-math';

/**
 * A color picker (#458 M7): a hue/saturation wheel over native range sliders.
 *
 *   <div class="color-picker" role="group" aria-label=<label> data-color-picker=<id>>
 *     <div class="color-picker-frame" style="--mp-color-picker-size; -x; -y; -darken; -hue-color; -peak; -color">
 *       <div class="color-picker-wheel" role="slider" aria-roledescription="color wheel"
 *            aria-valuenow=<hue> aria-valuetext="Hue 120°, saturation 40%" tabindex=0>
 *         <div class="color-picker-darken"></div><div class="color-picker-marker"></div>
 *       </div>
 *       <input type=range class="form-range color-picker-strip color-picker-brightness" aria-label="Brightness">
 *       [<input type=range … color-picker-alpha aria-label="Alpha">]
 *       [<div class="form-check form-switch"><input type=checkbox role=switch><label>Show hue + saturation sliders</label></div>]
 *       [<input type=range … color-picker-hue> <input type=range … color-picker-saturation>]
 *     </div>
 *   </div>
 *
 * The wheel is the one control without a native element: a focusable `role="slider"` (hue as its
 * value, saturation in its value text) with pointer drag and a keyboard map — Left/Right hue ±5°,
 * Up/Down saturation ±5% (Shift: 1), Page Up/Down hue ±30°, Home/End saturation 100%/0%. The
 * channel toggle reveals 1-D hue and saturation sliders, so every channel also has a plain
 * slider for screen-reader users.
 *
 * `value` (hex `#rrggbb`), `alpha` (0..1) and `channelSlidersVisible` are two-way. Hue and
 * saturation live in the state too, so a grey (where the hex has no hue) keeps the hue the user
 * picked. No-JS tier 2: the server renders the picker with every control disabled; it comes
 * alive once hydrated.
 */
export interface ColorPickerLabels {
  /** Names the whole picker when the consumer gives no `aria-label`. */
  group: string;
  wheel: string;
  /** The wheel's `aria-roledescription`. */
  wheelRole: string;
  /** The wheel's value text, from the hue in degrees and the saturation in percent. */
  wheelValue: (hue: number, saturation: number) => string;
  hue: string;
  saturation: string;
  brightness: string;
  alpha: string;
  channelToggle: string;
}

export const DEFAULT_COLOR_PICKER_LABELS: ColorPickerLabels = {
  group: 'Color picker',
  wheel: 'Color wheel: arrow left and right adjust hue, arrow up and down adjust saturation',
  wheelRole: 'color wheel',
  wheelValue: (hue, saturation) => `Hue ${hue}°, saturation ${saturation}%`,
  hue: 'Hue',
  saturation: 'Saturation',
  brightness: 'Brightness',
  alpha: 'Alpha',
  channelToggle: 'Show hue + saturation sliders',
};

export interface ColorPickerInputs {
  /** The color as `#rrggbb` (`#rgb` is accepted). */
  value: string;
  /** The opacity, 0..1. */
  alpha: number;
  channelSlidersVisible: boolean;
  /** The wheel's diameter (and the sliders' width) in pixels. */
  size: number;
  allowAlpha: boolean;
  /** Renders the toggle that reveals the hue and saturation sliders. */
  showAccessibilityToggle: boolean;
  disabled: boolean;
  labels: Partial<ColorPickerLabels> | null;
}

export interface ColorPickerState {
  value: string;
  /** Degrees, 0..360. */
  hue: number;
  /** HSV saturation, 0..1. */
  saturation: number;
  /** HSV value, 0..1. */
  brightness: number;
  alpha: number;
  channelSlidersVisible: boolean;
}

export type ColorPickerChannel = 'hue' | 'saturation' | 'brightness' | 'alpha';

export interface ColorPickerSlider {
  attrs: CoreBag;
  /** The slider's live value: a property, the attribute is only its default. */
  value: number;
}

export interface ColorPickerView {
  root: CoreBag;
  frame: CoreBag;
  frameStyle: Record<string, string>;
  wheel: CoreBag;
  brightness: ColorPickerSlider;
  alpha: ColorPickerSlider | null;
  toggle: { wrapper: CoreBag; input: CoreBag; checked: boolean; label: CoreBag; text: string } | null;
  hue: ColorPickerSlider | null;
  saturation: ColorPickerSlider | null;
}

/** Marks a channel slider; its value names the channel. */
export const COLOR_PICKER_CHANNEL_ATTR = 'data-color-channel';
export const COLOR_PICKER_WHEEL_ATTR = 'data-color-wheel';
export const COLOR_PICKER_TOGGLE_ATTR = 'data-color-toggle';
const ROOT_ATTR = 'data-color-picker';

const round = (n: number, digits = 2) => Number(n.toFixed(digits));
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const css = ({ r, g, b }: RgbColor) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;

/** The hex a hue/saturation/brightness triple formats to. */
export function colorPickerHex(state: Pick<ColorPickerState, 'hue' | 'saturation' | 'brightness'>): string {
  return rgb2hex(hsv2rgb({ hue: state.hue, saturation: state.saturation, value: state.brightness }));
}

/** Normalizes a consumer hex (`#RGB`, upper case) to `#rrggbb`; anything else is black. */
export function normalizeHex(value: string | null | undefined): string {
  return rgb2hex(hex2rgb(value ?? ''));
}

/**
 * The state for a consumer hex. A grey has no hue and black no saturation either, so those keep
 * the ones the picker already shows instead of jumping to red.
 */
export function seedColor(value: string, previous: Pick<ColorPickerState, 'hue' | 'saturation'> = { hue: 0, saturation: 0 }) {
  const hsv = hex2hsv(value);
  return {
    value: normalizeHex(value),
    hue: hsv.saturation === 0 || hsv.value === 0 ? previous.hue : hsv.hue,
    saturation: hsv.value === 0 ? previous.saturation : hsv.saturation,
    brightness: hsv.value,
  };
}

export function colorPickerLabels(labels: Partial<ColorPickerLabels> | null | undefined): ColorPickerLabels {
  return { ...DEFAULT_COLOR_PICKER_LABELS, ...(labels ?? {}) };
}

function slider(channel: ColorPickerChannel, label: string, max: number, value: number, unit: string, inactive: boolean): ColorPickerSlider {
  return {
    value,
    attrs: {
      type: 'range',
      class: `form-range color-picker-strip color-picker-${channel}`,
      min: '0',
      max: String(max),
      step: '1',
      value: String(value),
      'aria-label': label,
      'aria-valuetext': `${value}${unit}`,
      disabled: inactive ? '' : null,
      [COLOR_PICKER_CHANNEL_ATTR]: channel,
    },
  };
}

export function connectColorPicker(
  inputs: ColorPickerInputs,
  state: ColorPickerState,
  id: string,
  hydrated: boolean,
  consumerLabel: string | null = null,
): ColorPickerView {
  const labels = colorPickerLabels(inputs.labels);
  // Tier 2: nothing works before hydration, so nothing is offered as working.
  const inactive = inputs.disabled || !hydrated;
  const hue = Math.round(state.hue) % 360;
  const saturation = Math.round(state.saturation * 100);
  const brightness = Math.round(state.brightness * 100);
  const alpha = Math.round(state.alpha * 100);
  const { dx, dy } = hs2polar(state.hue, state.saturation, 50);
  const toggleId = `${id}-channels`;
  return {
    root: {
      class: 'color-picker',
      role: 'group',
      'aria-label': consumerLabel ?? labels.group,
      'aria-disabled': inputs.disabled ? 'true' : null,
      [ROOT_ATTR]: id,
      ...hydratedAttr(hydrated),
    },
    frame: { class: 'color-picker-frame' },
    frameStyle: {
      '--mp-color-picker-size': `${Math.max(0, inputs.size)}px`,
      '--mp-color-picker-x': `${round(50 + dx)}%`,
      '--mp-color-picker-y': `${round(50 + dy)}%`,
      '--mp-color-picker-darken': String(round(1 - state.brightness)),
      '--mp-color-picker-hue-color': `hsl(${hue} 100% 50%)`,
      '--mp-color-picker-peak': css(hsv2rgb({ hue: state.hue, saturation: state.saturation, value: 1 })),
      '--mp-color-picker-color': css(hsv2rgb({ hue: state.hue, saturation: state.saturation, value: state.brightness })),
    },
    wheel: {
      class: 'color-picker-wheel',
      role: 'slider',
      'aria-roledescription': labels.wheelRole,
      'aria-label': labels.wheel,
      'aria-valuemin': '0',
      'aria-valuemax': '360',
      'aria-valuenow': String(hue),
      'aria-valuetext': labels.wheelValue(hue, saturation),
      'aria-disabled': inactive ? 'true' : null,
      tabindex: inactive ? '-1' : '0',
      [COLOR_PICKER_WHEEL_ATTR]: '',
    },
    brightness: slider('brightness', labels.brightness, 100, brightness, '%', inactive),
    alpha: inputs.allowAlpha ? slider('alpha', labels.alpha, 100, alpha, '%', inactive) : null,
    toggle: inputs.showAccessibilityToggle
      ? {
          wrapper: { class: 'form-check form-switch color-picker-toggle' },
          input: {
            type: 'checkbox',
            class: 'form-check-input',
            role: 'switch',
            id: toggleId,
            checked: state.channelSlidersVisible ? '' : null,
            disabled: inactive ? '' : null,
            [COLOR_PICKER_TOGGLE_ATTR]: '',
          },
          checked: state.channelSlidersVisible,
          label: { class: 'form-check-label', for: toggleId },
          text: labels.channelToggle,
        }
      : null,
    hue: inputs.showAccessibilityToggle && state.channelSlidersVisible ? slider('hue', labels.hue, 360, hue, '°', inactive) : null,
    saturation: inputs.showAccessibilityToggle && state.channelSlidersVisible
      ? slider('saturation', labels.saturation, 100, saturation, '%', inactive)
      : null,
  };
}

/** The wheel's keyboard map: the next hue and saturation, or null when the key is not the wheel's. */
export function wheelKey(key: string, shift: boolean, hue: number, saturation: number): { hue: number; saturation: number } | null {
  const hueStep = shift ? 1 : 5;
  const satStep = shift ? 0.01 : 0.05;
  const turn = (by: number) => ({ hue: (((hue + by) % 360) + 360) % 360, saturation });
  const tint = (to: number) => ({ hue, saturation: round(clamp(to, 0, 1)) });
  switch (key) {
    case 'ArrowRight': return turn(hueStep);
    case 'ArrowLeft': return turn(-hueStep);
    case 'PageUp': return turn(30);
    case 'PageDown': return turn(-30);
    case 'ArrowUp': return tint(saturation + satStep);
    case 'ArrowDown': return tint(saturation - satStep);
    case 'Home': return tint(1);
    case 'End': return tint(0);
    default: return null;
  }
}

type ColorPickerEvents = { valueChange: string; alphaChange: number; channelSlidersVisibleChange: boolean };

export const colorPickerCore = defineCore<ColorPickerInputs, ColorPickerState, { view: ColorPickerView }, ColorPickerEvents>({
  state: (inputs) => ({
    // The model keeps what the consumer wrote; only the picker's own picks are normalized.
    ...seedColor(inputs.value),
    value: inputs.value,
    alpha: clamp(Number(inputs.alpha), 0, 1) || 0,
    channelSlidersVisible: !!inputs.channelSlidersVisible,
  }),
  view: ({ inputs, state, id, hydrated, label }) => ({ view: connectColorPicker(inputs, state, id, hydrated, label) }),
  attach: (api) => {
    const host = api.host;
    const own = (target: EventTarget | null, attr: string): HTMLElement | null => {
      const element = target instanceof Element ? target.closest<HTMLElement>(`[${attr}]`) : null;
      return element && element.closest(`[${ROOT_ATTR}]`) === host ? element : null;
    };
    /** Applies a hue/saturation/brightness change and reports the new hex. */
    const recolor = (patch: Partial<Pick<ColorPickerState, 'hue' | 'saturation' | 'brightness'>>) => {
      const next = { ...api.state(), ...patch };
      const value = colorPickerHex(next);
      const changed = value !== normalizeHex(api.state().value);
      api.setState({ ...patch, value });
      if (changed) api.emit('valueChange', value);
    };

    const onInput = (event: Event) => {
      const input = own(event.target, COLOR_PICKER_CHANNEL_ATTR) as HTMLInputElement | null;
      if (!input || api.inputs().disabled) return;
      const amount = Number(input.value);
      if (Number.isNaN(amount)) return;
      switch (input.getAttribute(COLOR_PICKER_CHANNEL_ATTR) as ColorPickerChannel) {
        case 'hue': return recolor({ hue: clamp(amount, 0, 360) });
        case 'saturation': return recolor({ saturation: clamp(amount / 100, 0, 1) });
        case 'brightness': return recolor({ brightness: clamp(amount / 100, 0, 1) });
        case 'alpha': {
          const alpha = clamp(amount / 100, 0, 1);
          if (alpha === api.state().alpha) return;
          api.setState({ alpha });
          api.emit('alphaChange', alpha);
        }
      }
    };

    const onChange = (event: Event) => {
      const toggle = own(event.target, COLOR_PICKER_TOGGLE_ATTR) as HTMLInputElement | null;
      if (!toggle) return;
      api.setState({ channelSlidersVisible: toggle.checked });
      api.emit('channelSlidersVisibleChange', toggle.checked);
    };

    /** The pointer dragging the wheel, if any. */
    let dragging: number | null = null;
    const pick = (wheel: HTMLElement, event: PointerEvent) => {
      const rect = wheel.getBoundingClientRect();
      const radius = rect.width / 2;
      if (radius <= 0) return;
      const { hue, saturation } = polar2hs(event.clientX - rect.left - radius, event.clientY - rect.top - radius, radius);
      recolor({ hue, saturation });
    };
    const onPointerDown = (event: PointerEvent) => {
      const wheel = own(event.target, COLOR_PICKER_WHEEL_ATTR);
      if (!wheel || api.inputs().disabled || event.button !== 0) return;
      // A mouse press would select text; a touch one must not be cancelled (touch-action does that).
      if (event.pointerType === 'mouse') event.preventDefault();
      wheel.focus();
      dragging = event.pointerId;
      wheel.setPointerCapture?.(event.pointerId);
      pick(wheel, event);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragging !== event.pointerId) return;
      const wheel = own(event.target, COLOR_PICKER_WHEEL_ATTR);
      if (wheel) pick(wheel, event);
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (dragging === event.pointerId) dragging = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!own(event.target, COLOR_PICKER_WHEEL_ATTR) || api.inputs().disabled) return;
      const { hue, saturation } = api.state();
      const next = wheelKey(event.key, event.shiftKey, hue, saturation);
      if (!next) return;
      event.preventDefault();
      if (next.hue !== hue || next.saturation !== saturation) recolor(next);
    };

    host.addEventListener('input', onInput);
    host.addEventListener('change', onChange);
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerEnd);
    host.addEventListener('pointercancel', onPointerEnd);
    host.addEventListener('keydown', onKeyDown);
    return () => {
      host.removeEventListener('input', onInput);
      host.removeEventListener('change', onChange);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerEnd);
      host.removeEventListener('pointercancel', onPointerEnd);
      host.removeEventListener('keydown', onKeyDown);
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    const state = api.state();
    const patch: Partial<ColorPickerState> = {};
    if (inputs.value !== prev.value && normalizeHex(inputs.value) !== normalizeHex(state.value)) {
      Object.assign(patch, seedColor(inputs.value, state), { value: inputs.value });
    }
    const alpha = clamp(Number(inputs.alpha), 0, 1) || 0;
    if (inputs.alpha !== prev.alpha && alpha !== state.alpha) patch.alpha = alpha;
    if (inputs.channelSlidersVisible !== prev.channelSlidersVisible && !!inputs.channelSlidersVisible !== state.channelSlidersVisible) {
      patch.channelSlidersVisible = !!inputs.channelSlidersVisible;
    }
    if (Object.keys(patch).length) api.setState(patch);
  },
});
