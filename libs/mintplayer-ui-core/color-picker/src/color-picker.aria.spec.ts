import { describe, expect, it } from 'vitest';
import {
  connectColorPicker,
  seedColor,
  wheelKey,
  type ColorPickerInputs,
  type ColorPickerState,
} from './color-picker.core';

const INPUTS: ColorPickerInputs = {
  value: '#ff0000',
  alpha: 1,
  channelSlidersVisible: false,
  size: 150,
  allowAlpha: true,
  showAccessibilityToggle: true,
  disabled: false,
  labels: null,
};

const state = (patch: Partial<ColorPickerState> = {}): ColorPickerState => ({
  ...seedColor('#ff0000'),
  alpha: 1,
  channelSlidersVisible: false,
  ...patch,
});

const view = (inputs: Partial<ColorPickerInputs> = {}, s: Partial<ColorPickerState> = {}, hydrated = true, label: string | null = null) =>
  connectColorPicker({ ...INPUTS, ...inputs }, state(s), 'cp', hydrated, label);

describe('color picker ARIA', () => {
  it('is a named group; a consumer aria-label wins', () => {
    expect(view().root).toMatchObject({ role: 'group', 'aria-label': 'Color picker' });
    expect(view({}, {}, true, 'Text color').root['aria-label']).toBe('Text color');
  });

  it('exposes the wheel as a focusable slider with the hue as value and saturation in the text', () => {
    const wheel = view({}, { hue: 120, saturation: 0.4 }).wheel;
    expect(wheel).toMatchObject({
      role: 'slider',
      'aria-roledescription': 'color wheel',
      'aria-valuemin': '0',
      'aria-valuemax': '360',
      'aria-valuenow': '120',
      'aria-valuetext': 'Hue 120°, saturation 40%',
      tabindex: '0',
      'aria-disabled': null,
    });
    expect(wheel['aria-label']).toContain('Color wheel');
  });

  it('names every slider and gives it a unit in its value text', () => {
    const v = view({}, { brightness: 0.5, alpha: 0.25, channelSlidersVisible: true, hue: 200, saturation: 0.3 });
    expect(v.brightness.attrs).toMatchObject({ type: 'range', 'aria-label': 'Brightness', 'aria-valuetext': '50%', max: '100' });
    expect(v.alpha?.attrs).toMatchObject({ 'aria-label': 'Alpha', 'aria-valuetext': '25%' });
    expect(v.hue?.attrs).toMatchObject({ 'aria-label': 'Hue', 'aria-valuetext': '200°', max: '360' });
    expect(v.saturation?.attrs).toMatchObject({ 'aria-label': 'Saturation', 'aria-valuetext': '30%' });
  });

  it('renders the channel toggle as a labelled switch reflecting the state', () => {
    const off = view();
    expect(off.toggle?.input).toMatchObject({ type: 'checkbox', role: 'switch', id: 'cp-channels', checked: null });
    expect(off.toggle?.label).toMatchObject({ for: 'cp-channels' });
    expect(off.hue).toBeNull();
    const on = view({}, { channelSlidersVisible: true });
    expect(on.toggle?.checked).toBe(true);
    expect(on.toggle?.input['checked']).toBe('');
  });

  it('drops the alpha slider and the toggle when switched off', () => {
    const v = view({ allowAlpha: false, showAccessibilityToggle: false }, { channelSlidersVisible: true });
    expect(v.alpha).toBeNull();
    expect(v.toggle).toBeNull();
    expect(v.hue).toBeNull();
  });

  it.each([
    ['before hydration (tier 2)', () => view({}, {}, false)],
    ['while disabled', () => view({ disabled: true })],
  ])('offers nothing as working %s', (_, make) => {
    const v = make();
    expect(v.wheel).toMatchObject({ 'aria-disabled': 'true', tabindex: '-1' });
    expect(v.brightness.attrs['disabled']).toBe('');
    expect(v.toggle?.input['disabled']).toBe('');
  });

  it('marks the group disabled', () => {
    expect(view({ disabled: true }).root['aria-disabled']).toBe('true');
  });

  it('localizes the names', () => {
    const v = view({ labels: { wheelValue: (h, s) => `Tint ${h}, sat ${s}`, brightness: 'Helderheid' } });
    expect(v.wheel['aria-valuetext']).toBe('Tint 0, sat 100');
    expect(v.brightness.attrs['aria-label']).toBe('Helderheid');
    expect(v.alpha?.attrs['aria-label']).toBe('Alpha');
  });
});

describe('color picker wheel keys', () => {
  it('turns the hue with the horizontal arrows and Page Up/Down, wrapping', () => {
    expect(wheelKey('ArrowRight', false, 358, 0.5)).toEqual({ hue: 3, saturation: 0.5 });
    expect(wheelKey('ArrowLeft', true, 0, 0.5)).toEqual({ hue: 359, saturation: 0.5 });
    expect(wheelKey('PageDown', false, 10, 0.5)).toEqual({ hue: 340, saturation: 0.5 });
  });

  it('tints with the vertical arrows and Home/End, clamped', () => {
    expect(wheelKey('ArrowUp', false, 10, 0.98)).toEqual({ hue: 10, saturation: 1 });
    expect(wheelKey('ArrowDown', true, 10, 0.5)).toEqual({ hue: 10, saturation: 0.49 });
    expect(wheelKey('Home', false, 10, 0.2)).toEqual({ hue: 10, saturation: 1 });
    expect(wheelKey('End', false, 10, 0.2)).toEqual({ hue: 10, saturation: 0 });
  });

  it('ignores other keys', () => {
    expect(wheelKey('Enter', false, 10, 0.2)).toBeNull();
  });
});

describe('color picker seeding', () => {
  it('normalizes the hex and keeps the hue of a grey', () => {
    expect(seedColor('#F00')).toMatchObject({ value: '#ff0000', hue: 0, saturation: 1, brightness: 1 });
    expect(seedColor('#808080', { hue: 200, saturation: 0.7 })).toMatchObject({ hue: 200, saturation: 0 });
    expect(seedColor('#000000', { hue: 200, saturation: 0.7 })).toMatchObject({ hue: 200, saturation: 0.7, brightness: 0 });
  });
});
