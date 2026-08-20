import { afterEach, describe, expect, it } from 'vitest';

import './mp-ribbon-button.element';
import './mp-ribbon-toggle-button.element';
import './mp-ribbon-checkbox.element';
import './mp-ribbon-combobox.element';
import './mp-ribbon-color-picker.element';
import './mp-ribbon-group-button.element';
import './mp-ribbon-menu-item.element';
import './mp-ribbon-menu-separator.element';
import './mp-ribbon-gallery.element';
import './mp-ribbon-gallery-item.element';
import './mp-ribbon-template-item.element';

import type { MpRibbonButton } from './mp-ribbon-button.element';
import type { MpRibbonToggleButton } from './mp-ribbon-toggle-button.element';
import type { MpRibbonCheckBox } from './mp-ribbon-checkbox.element';
import type { MpRibbonComboBox } from './mp-ribbon-combobox.element';
import type { MpRibbonColorPicker } from './mp-ribbon-color-picker.element';
import type { MpRibbonGroupButton } from './mp-ribbon-group-button.element';
import type { MpRibbonMenuItem } from './mp-ribbon-menu-item.element';
import type { MpRibbonGallery } from './mp-ribbon-gallery.element';
import type { MpRibbonGalleryItem } from './mp-ribbon-gallery-item.element';
import type { MpRibbonTemplateItem } from './mp-ribbon-template-item.element';

/**
 * The ribbon item family: eleven elements that shipped with no spec at all, so
 * every one of them was absent from the coverage report rather than at 0%.
 *
 * Two things are asserted throughout, because they are the contract the ribbon
 * itself and every framework wrapper depend on:
 *
 *  - **Events cross the shadow boundary.** All of them are dispatched
 *    `composed: true, bubbles: true`; a wrapper listening on the host would
 *    receive nothing otherwise, and that failure is invisible in the element's
 *    own DOM.
 *  - **`disabled` is enforced in the handler, not only on the inner control.**
 *    A programmatic `.click()` reaches the listener even when the native button
 *    is disabled in some engines, so the guard has to be its own check.
 */

const mounted: HTMLElement[] = [];

async function mount<T extends HTMLElement>(markup: string): Promise<T> {
  const container = document.createElement('div');
  container.innerHTML = markup;
  document.body.appendChild(container);
  mounted.push(container);
  const element = container.firstElementChild as T;
  await (element as unknown as { updateComplete: Promise<void> }).updateComplete;
  return element;
}

/** Collect every event of `type` that escapes the element's host. */
function record(element: HTMLElement, type: string): CustomEvent[] {
  const seen: CustomEvent[] = [];
  document.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
}

const shadow = (element: HTMLElement) => element.shadowRoot!;

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-button', () => {
  it('renders its label', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button label="Copy"></mp-ribbon-button>');
    expect(shadow(el).textContent).toContain('Copy');
  });

  it('renders no label span when there is no label', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button></mp-ribbon-button>');
    expect(shadow(el).querySelector('.ribbon-button-label')).toBeNull();
  });

  it('emits item-click across the shadow boundary', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button item-id="copy" label="Copy"></mp-ribbon-button>');
    const seen = record(el, 'item-click');
    shadow(el).querySelector('button')!.click();
    expect(seen.map((e) => e.detail.itemId)).toEqual(['copy']);
  });

  it('does not emit item-click when disabled', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button item-id="c" disabled></mp-ribbon-button>');
    const seen = record(el, 'item-click');
    shadow(el).querySelector('button')!.click();
    expect(seen).toEqual([]);
  });

  it('disables its inner button', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button disabled></mp-ribbon-button>');
    expect(shadow(el).querySelector('button')!.disabled).toBe(true);
  });

  it('falls back to the label for the tooltip', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button label="Copy"></mp-ribbon-button>');
    expect(shadow(el).querySelector('button')!.title).toBe('Copy');
  });

  it('prefers an explicit tooltip over the label', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button label="Copy" tooltip="Copy (Ctrl+C)"></mp-ribbon-button>');
    expect(shadow(el).querySelector('button')!.title).toBe('Copy (Ctrl+C)');
  });

  it.each(['large', 'medium', 'small'])('carries a %s size class', async (size) => {
    const el = await mount<MpRibbonButton>(`<mp-ribbon-button size="${size}"></mp-ribbon-button>`);
    expect(shadow(el).querySelector('button')!.classList).toContain(`ribbon-item-${size}`);
  });

  // FR-5: consumer light-DOM CSS targets `bs-ribbon-button[data-size="large"]`
  // without reaching into a shadow root, so this mirror is public API.
  it('mirrors size to data-size on the host', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button size="large"></mp-ribbon-button>');
    expect(el.getAttribute('data-size')).toBe('large');
  });

  it('updates data-size when size changes', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button size="large"></mp-ribbon-button>');
    el.size = 'small';
    await el.updateComplete;
    expect(el.getAttribute('data-size')).toBe('small');
  });

  it('exposes an icon slot', async () => {
    const el = await mount<MpRibbonButton>('<mp-ribbon-button><i slot="icon">x</i></mp-ribbon-button>');
    expect(shadow(el).querySelector('slot[name="icon"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-toggle-button', () => {
  it('starts unpressed and says so on the role', async () => {
    const el = await mount<MpRibbonToggleButton>('<mp-ribbon-toggle-button label="Bold"></mp-ribbon-toggle-button>');
    expect(shadow(el).querySelector('button')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles pressed on click', async () => {
    const el = await mount<MpRibbonToggleButton>('<mp-ribbon-toggle-button item-id="b"></mp-ribbon-toggle-button>');
    shadow(el).querySelector('button')!.click();
    expect(el.pressed).toBe(true);
  });

  it('updates aria-pressed in the same render as the visual change', async () => {
    const el = await mount<MpRibbonToggleButton>('<mp-ribbon-toggle-button></mp-ribbon-toggle-button>');
    shadow(el).querySelector('button')!.click();
    await el.updateComplete;
    const button = shadow(el).querySelector('button')!;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList).toContain('pressed');
  });

  it('toggles back on a second click', async () => {
    const el = await mount<MpRibbonToggleButton>('<mp-ribbon-toggle-button></mp-ribbon-toggle-button>');
    shadow(el).querySelector('button')!.click();
    await el.updateComplete;
    shadow(el).querySelector('button')!.click();
    expect(el.pressed).toBe(false);
  });

  it('emits toggle with the new state', async () => {
    const el = await mount<MpRibbonToggleButton>('<mp-ribbon-toggle-button item-id="b"></mp-ribbon-toggle-button>');
    const seen = record(el, 'toggle');
    shadow(el).querySelector('button')!.click();
    expect(seen[0].detail).toEqual({ itemId: 'b', pressed: true });
  });

  it('reflects pressed to an attribute', async () => {
    const el = await mount<MpRibbonToggleButton>('<mp-ribbon-toggle-button></mp-ribbon-toggle-button>');
    el.pressed = true;
    await el.updateComplete;
    expect(el.hasAttribute('pressed')).toBe(true);
  });

  it('neither toggles nor emits when disabled', async () => {
    const el = await mount<MpRibbonToggleButton>('<mp-ribbon-toggle-button disabled></mp-ribbon-toggle-button>');
    const seen = record(el, 'toggle');
    shadow(el).querySelector('button')!.click();
    expect(el.pressed).toBe(false);
    expect(seen).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-checkbox', () => {
  const input = (el: HTMLElement) => shadow(el).querySelector('input')!;

  it('renders a native checkbox — the role and state come free', async () => {
    const el = await mount<MpRibbonCheckBox>('<mp-ribbon-checkbox label="Wrap"></mp-ribbon-checkbox>');
    expect(input(el).type).toBe('checkbox');
  });

  it('names it with a wrapping label rather than an IDREF', async () => {
    const el = await mount<MpRibbonCheckBox>('<mp-ribbon-checkbox label="Wrap"></mp-ribbon-checkbox>');
    expect(shadow(el).querySelector('label')!.contains(input(el))).toBe(true);
    expect(shadow(el).querySelector('.ribbon-checkbox-label')!.textContent).toBe('Wrap');
  });

  it('starts from the checked property', async () => {
    const el = await mount<MpRibbonCheckBox>('<mp-ribbon-checkbox checked></mp-ribbon-checkbox>');
    expect(input(el).checked).toBe(true);
  });

  it('adopts the input state on change', async () => {
    const el = await mount<MpRibbonCheckBox>('<mp-ribbon-checkbox item-id="w"></mp-ribbon-checkbox>');
    input(el).click();
    expect(el.checked).toBe(true);
  });

  it('emits check-change with the new state', async () => {
    const el = await mount<MpRibbonCheckBox>('<mp-ribbon-checkbox item-id="w"></mp-ribbon-checkbox>');
    const seen = record(el, 'check-change');
    input(el).click();
    expect(seen[0].detail).toEqual({ itemId: 'w', checked: true });
  });

  it('reflects checked to an attribute', async () => {
    const el = await mount<MpRibbonCheckBox>('<mp-ribbon-checkbox></mp-ribbon-checkbox>');
    el.checked = true;
    await el.updateComplete;
    expect(el.hasAttribute('checked')).toBe(true);
  });

  it('disables the input and marks the label', async () => {
    const el = await mount<MpRibbonCheckBox>('<mp-ribbon-checkbox disabled></mp-ribbon-checkbox>');
    expect(input(el).disabled).toBe(true);
    expect(shadow(el).querySelector('label')!.classList).toContain('disabled');
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-combobox', () => {
  const select = (el: HTMLElement) => shadow(el).querySelector('select')!;

  async function mountCombo(value = '') {
    const el = await mount<MpRibbonComboBox>(
      `<mp-ribbon-combobox item-id="font" label="Font" value="${value}"></mp-ribbon-combobox>`,
    );
    el.options = [
      { label: 'Arial', value: 'arial' },
      { label: 'Times', value: 'times' },
    ];
    await el.updateComplete;
    return el;
  }

  it('renders one option per entry', async () => {
    const el = await mountCombo();
    expect([...select(el).options].map((o) => o.value)).toEqual(['arial', 'times']);
  });

  it('renders nothing but an empty select with no options', async () => {
    const el = await mount<MpRibbonComboBox>('<mp-ribbon-combobox></mp-ribbon-combobox>');
    expect(select(el).options).toHaveLength(0);
  });

  it('marks the current value selected', async () => {
    const el = await mountCombo('times');
    expect(select(el).value).toBe('times');
  });

  // The role lives on an inner <select>, so a consumer's aria-label on the host
  // could never reach it — the element has to render `label` onto the control.
  it('names the inner select from the label property', async () => {
    const el = await mountCombo();
    expect(select(el).getAttribute('aria-label')).toBe('Font');
  });

  it('adopts the selected value and emits value-change', async () => {
    const el = await mountCombo();
    const seen = record(el, 'value-change');
    select(el).value = 'times';
    select(el).dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.value).toBe('times');
    expect(seen[0].detail).toEqual({ itemId: 'font', value: 'times' });
  });

  it('disables the select', async () => {
    const el = await mount<MpRibbonComboBox>('<mp-ribbon-combobox disabled></mp-ribbon-combobox>');
    expect(select(el).disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-color-picker', () => {
  const input = (el: HTMLElement) => shadow(el).querySelector('input')!;

  it('wraps a native colour input rather than reimplementing a palette', async () => {
    const el = await mount<MpRibbonColorPicker>('<mp-ribbon-color-picker></mp-ribbon-color-picker>');
    expect(input(el).type).toBe('color');
  });

  it('names the input from the label', async () => {
    const el = await mount<MpRibbonColorPicker>('<mp-ribbon-color-picker label="Text colour"></mp-ribbon-color-picker>');
    expect(input(el).getAttribute('aria-label')).toBe('Text colour');
  });

  it('adopts the picked colour and emits color-change', async () => {
    const el = await mount<MpRibbonColorPicker>('<mp-ribbon-color-picker item-id="fg"></mp-ribbon-color-picker>');
    const seen = record(el, 'color-change');
    input(el).value = '#ff0000';
    input(el).dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.color).toBe('#ff0000');
    expect(seen[0].detail).toEqual({ itemId: 'fg', color: '#ff0000' });
  });

  it('reflects the colour to an attribute', async () => {
    const el = await mount<MpRibbonColorPicker>('<mp-ribbon-color-picker></mp-ribbon-color-picker>');
    el.color = '#00ff00';
    await el.updateComplete;
    expect(el.getAttribute('color')).toBe('#00ff00');
  });

  it('renders no label span without a label', async () => {
    const el = await mount<MpRibbonColorPicker>('<mp-ribbon-color-picker></mp-ribbon-color-picker>');
    expect(shadow(el).querySelector('.ribbon-color-picker-label')).toBeNull();
  });

  it('disables the input and marks the label', async () => {
    const el = await mount<MpRibbonColorPicker>('<mp-ribbon-color-picker disabled></mp-ribbon-color-picker>');
    expect(input(el).disabled).toBe(true);
    expect(shadow(el).querySelector('label')!.classList).toContain('disabled');
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-group-button', () => {
  async function mountGroupButton(selected = '') {
    const el = await mount<MpRibbonGroupButton>(
      `<mp-ribbon-group-button item-id="align" label="Align" selected-value="${selected}"></mp-ribbon-group-button>`,
    );
    el.buttons = [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ];
    await el.updateComplete;
    return el;
  }

  const radios = (el: HTMLElement) => [...shadow(el).querySelectorAll('button[role="radio"]')];

  it('is a radiogroup of radios', async () => {
    const el = await mountGroupButton();
    expect(shadow(el).querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(radios(el)).toHaveLength(2);
  });

  it('names the radiogroup from the label', async () => {
    const el = await mountGroupButton();
    expect(shadow(el).querySelector('[role="radiogroup"]')!.getAttribute('aria-label')).toBe('Align');
  });

  it('marks exactly the selected radio checked', async () => {
    const el = await mountGroupButton('right');
    expect(radios(el).map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);
  });

  it('marks nothing checked when no value is selected', async () => {
    const el = await mountGroupButton();
    expect(radios(el).every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('selects on click and emits group-select', async () => {
    const el = await mountGroupButton();
    const seen = record(el, 'group-select');
    (radios(el)[1] as HTMLElement).click();
    expect(el.selectedValue).toBe('right');
    expect(seen[0].detail).toEqual({ itemId: 'align', value: 'right' });
  });

  it('moves aria-checked with the selection', async () => {
    const el = await mountGroupButton('left');
    (radios(el)[1] as HTMLElement).click();
    await el.updateComplete;
    expect(radios(el).map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);
  });

  // The inner buttons stop propagation so a group-button inside a ribbon does
  // not also read as a plain item activation.
  it('does not emit item-click as well', async () => {
    const el = await mountGroupButton();
    const seen = record(el, 'item-click');
    (radios(el)[0] as HTMLElement).click();
    expect(seen).toEqual([]);
  });

  it('neither selects nor emits when disabled', async () => {
    const el = await mountGroupButton();
    el.disabled = true;
    await el.updateComplete;
    const seen = record(el, 'group-select');
    (radios(el)[1] as HTMLElement).click();
    expect(el.selectedValue).toBe('');
    expect(seen).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-menu-item', () => {
  const button = (el: HTMLElement) => shadow(el).querySelector('button')!;

  it.each([
    ['action', 'menuitem'],
    ['checkbox', 'menuitemcheckbox'],
    ['radio', 'menuitemradio'],
  ])('kind=%s takes the %s role', async (kind, role) => {
    const el = await mount<MpRibbonMenuItem>(`<mp-ribbon-menu-item kind="${kind}"></mp-ribbon-menu-item>`);
    expect(button(el).getAttribute('role')).toBe(role);
  });

  // `menuitem` has no checked state in ARIA, so aria-checked must be absent
  // rather than "false" — an invalid attribute is worse than a missing one.
  it('omits aria-checked entirely on an action item', async () => {
    const el = await mount<MpRibbonMenuItem>('<mp-ribbon-menu-item kind="action"></mp-ribbon-menu-item>');
    expect(button(el).hasAttribute('aria-checked')).toBe(false);
  });

  it.each(['checkbox', 'radio'])('publishes aria-checked on a %s item', async (kind) => {
    const el = await mount<MpRibbonMenuItem>(`<mp-ribbon-menu-item kind="${kind}"></mp-ribbon-menu-item>`);
    expect(button(el).getAttribute('aria-checked')).toBe('false');
  });

  it('renders no check column on an action item', async () => {
    const el = await mount<MpRibbonMenuItem>('<mp-ribbon-menu-item kind="action"></mp-ribbon-menu-item>');
    expect(shadow(el).querySelector('.menu-item-check')).toBeNull();
  });

  it('toggles a checkbox item', async () => {
    const el = await mount<MpRibbonMenuItem>('<mp-ribbon-menu-item kind="checkbox"></mp-ribbon-menu-item>');
    button(el).click();
    expect(el.checked).toBe(true);
    button(el).click();
    expect(el.checked).toBe(false);
  });

  // A radio only ever turns ON — clearing it is the sibling's job, not its own.
  it('latches a radio item on', async () => {
    const el = await mount<MpRibbonMenuItem>('<mp-ribbon-menu-item kind="radio"></mp-ribbon-menu-item>');
    button(el).click();
    button(el).click();
    expect(el.checked).toBe(true);
  });

  it('leaves an action item unchecked', async () => {
    const el = await mount<MpRibbonMenuItem>('<mp-ribbon-menu-item kind="action"></mp-ribbon-menu-item>');
    button(el).click();
    expect(el.checked).toBe(false);
  });

  it('emits menu-select with the resulting state', async () => {
    const el = await mount<MpRibbonMenuItem>('<mp-ribbon-menu-item item-id="wrap" kind="checkbox"></mp-ribbon-menu-item>');
    const seen = record(el, 'menu-select');
    button(el).click();
    expect(seen[0].detail).toEqual({ itemId: 'wrap', checked: true });
  });

  it('neither changes nor emits when disabled', async () => {
    const el = await mount<MpRibbonMenuItem>('<mp-ribbon-menu-item kind="checkbox" disabled></mp-ribbon-menu-item>');
    const seen = record(el, 'menu-select');
    button(el).click();
    expect(el.checked).toBe(false);
    expect(seen).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-menu-separator', () => {
  it('takes the separator role on the host, where a menu can see it', async () => {
    const el = await mount('<mp-ribbon-menu-separator></mp-ribbon-menu-separator>');
    expect(el.getAttribute('role')).toBe('separator');
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-gallery', () => {
  it('is a listbox named by its label', async () => {
    const el = await mount<MpRibbonGallery>('<mp-ribbon-gallery label="Styles"></mp-ribbon-gallery>');
    const listbox = shadow(el).querySelector('[role="listbox"]')!;
    expect(listbox.getAttribute('aria-label')).toBe('Styles');
  });

  it('lays out four columns by default', async () => {
    const el = await mount<MpRibbonGallery>('<mp-ribbon-gallery></mp-ribbon-gallery>');
    expect(shadow(el).querySelector('.ribbon-gallery')!.getAttribute('style'))
      .toContain('repeat(4, 1fr)');
  });

  it('honours an explicit column count', async () => {
    const el = await mount<MpRibbonGallery>('<mp-ribbon-gallery columns="6"></mp-ribbon-gallery>');
    expect(shadow(el).querySelector('.ribbon-gallery')!.getAttribute('style'))
      .toContain('repeat(6, 1fr)');
  });

  it('projects its items', async () => {
    const el = await mount<MpRibbonGallery>(
      '<mp-ribbon-gallery><mp-ribbon-gallery-item item-id="a"></mp-ribbon-gallery-item></mp-ribbon-gallery>',
    );
    expect(shadow(el).querySelector('slot')).not.toBeNull();
    expect(el.querySelectorAll('mp-ribbon-gallery-item')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-gallery-item', () => {
  const button = (el: HTMLElement) => shadow(el).querySelector('button')!;

  it('is an option inside the gallery listbox', async () => {
    const el = await mount<MpRibbonGalleryItem>('<mp-ribbon-gallery-item></mp-ribbon-gallery-item>');
    expect(button(el).getAttribute('role')).toBe('option');
  });

  it('publishes its selected state on the role', async () => {
    const el = await mount<MpRibbonGalleryItem>('<mp-ribbon-gallery-item selected></mp-ribbon-gallery-item>');
    expect(button(el).getAttribute('aria-selected')).toBe('true');
  });

  it('reflects selected to an attribute', async () => {
    const el = await mount<MpRibbonGalleryItem>('<mp-ribbon-gallery-item></mp-ribbon-gallery-item>');
    el.selected = true;
    await el.updateComplete;
    expect(el.hasAttribute('selected')).toBe(true);
    expect(button(el).getAttribute('aria-selected')).toBe('true');
  });

  it('is named by its label', async () => {
    const el = await mount<MpRibbonGalleryItem>('<mp-ribbon-gallery-item label="Heading 1"></mp-ribbon-gallery-item>');
    expect(button(el).getAttribute('aria-label')).toBe('Heading 1');
  });

  it('emits gallery-select on activation', async () => {
    const el = await mount<MpRibbonGalleryItem>('<mp-ribbon-gallery-item item-id="h1"></mp-ribbon-gallery-item>');
    const seen = record(el, 'gallery-select');
    button(el).click();
    expect(seen[0].detail).toEqual({ itemId: 'h1' });
  });

  it('does not emit when disabled', async () => {
    const el = await mount<MpRibbonGalleryItem>('<mp-ribbon-gallery-item disabled></mp-ribbon-gallery-item>');
    const seen = record(el, 'gallery-select');
    button(el).click();
    expect(seen).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-template-item', () => {
  it('projects arbitrary content', async () => {
    const el = await mount<MpRibbonTemplateItem>(
      '<mp-ribbon-template-item><span id="custom">x</span></mp-ribbon-template-item>',
    );
    expect(shadow(el).querySelector('slot')).not.toBeNull();
    expect(el.querySelector('#custom')).not.toBeNull();
  });

  // The group places items with `::slotted([size="..."])`, so an unreflected
  // size would silently drop the item out of the grid.
  it('reflects size so the group can place it', async () => {
    const el = await mount<MpRibbonTemplateItem>('<mp-ribbon-template-item></mp-ribbon-template-item>');
    el.size = 'large';
    await el.updateComplete;
    expect(el.getAttribute('size')).toBe('large');
  });

  it('defaults to medium', async () => {
    const el = await mount<MpRibbonTemplateItem>('<mp-ribbon-template-item></mp-ribbon-template-item>');
    expect(el.size).toBe('medium');
  });
});
