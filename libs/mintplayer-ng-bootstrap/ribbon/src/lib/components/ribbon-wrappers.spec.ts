import { Component, Type, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';

import { BsQuickAccessToolbarComponent } from './quick-access-toolbar.component';
import { BsRibbonButtonComponent } from './ribbon-button.component';
import { BsRibbonCheckBoxComponent } from './ribbon-check-box.component';
import { BsRibbonColorPickerComponent } from './ribbon-color-picker.component';
import { BsRibbonComboBoxComponent } from './ribbon-combo-box.component';
import { BsRibbonDropdownButtonComponent } from './ribbon-dropdown-button.component';
import { BsRibbonGalleryComponent } from './ribbon-gallery.component';
import { BsRibbonGalleryItemComponent } from './ribbon-gallery-item.component';
import { BsRibbonGroupButtonComponent } from './ribbon-group-button.component';
import { BsRibbonMenuItemComponent } from './ribbon-menu-item.component';
import { BsRibbonMenuSeparatorComponent } from './ribbon-menu-separator.component';
import { BsRibbonSplitButtonComponent } from './ribbon-split-button.component';
import { BsRibbonTemplateItemComponent } from './ribbon-template-item.component';
import { BsRibbonToggleButtonComponent } from './ribbon-toggle-button.component';

/**
 * The eighteen Angular ribbon wrappers, none of which had a spec.
 *
 * The web components are deliberately NOT imported. A wrapper's job is to put
 * the right attributes on an `mp-*` element and to bridge that element's events
 * back out as Angular outputs; an undefined custom element is inert and holds
 * its attributes exactly, which isolates the wrapper from the element's own
 * behaviour. Where the element IS the thing under test, that lives next to it in
 * libs/mintplayer-web-components/ribbon.
 *
 * Inputs are driven from `signal()`s on the host on purpose. A plain mutable
 * field notifies nothing, so `detectChanges()` never re-evaluates the binding
 * and a passthrough test would silently assert the initial value forever.
 */

/** Render `template` against a host exposing the given signals. */
async function render<T extends object>(
  imports: Type<unknown>[],
  template: string,
  state: () => T,
) {
  @Component({ imports, template, standalone: true })
  class Harness {
    readonly state = state();
    readonly events: unknown[] = [];
    record(value: unknown) {
      this.events.push(value);
    }
  }

  await TestBed.configureTestingModule({ imports: [Harness] }).compileComponents();
  const fixture = TestBed.createComponent(Harness);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance as Harness };
}

const inner = (fixture: { nativeElement: HTMLElement }, tag: string) =>
  fixture.nativeElement.querySelector(tag) as HTMLElement;

const wrapper = (fixture: { nativeElement: HTMLElement }, tag: string) =>
  fixture.nativeElement.querySelector(tag) as HTMLElement;

afterEach(() => TestBed.resetTestingModule());

// ---------------------------------------------------------------------------
// Attribute passthrough
// ---------------------------------------------------------------------------

describe('ribbon wrappers — attribute passthrough', () => {
  it('bs-ribbon-button forwards every input to the element', async () => {
    const { fixture } = await render(
      [BsRibbonButtonComponent],
      `<bs-ribbon-button
         [itemId]="state.itemId()" [label]="state.label()" [icon]="state.icon()"
         [size]="state.size()" [tooltip]="state.tooltip()" />`,
      () => ({
        itemId: signal('copy'),
        label: signal('Copy'),
        icon: signal('bi-copy'),
        size: signal<'large' | 'medium' | 'small'>('large'),
        tooltip: signal('Copy (Ctrl+C)'),
      }),
    );

    const el = inner(fixture, 'mp-ribbon-button');
    expect(el.getAttribute('item-id')).toBe('copy');
    expect(el.getAttribute('label')).toBe('Copy');
    expect(el.getAttribute('icon')).toBe('bi-copy');
    expect(el.getAttribute('size')).toBe('large');
    expect(el.getAttribute('tooltip')).toBe('Copy (Ctrl+C)');
  });

  it('follows a later input change', async () => {
    const state = { label: signal('Copy') };
    const { fixture } = await render(
      [BsRibbonButtonComponent],
      `<bs-ribbon-button [label]="state.label()" />`,
      () => state,
    );

    state.label.set('Cut');
    fixture.detectChanges();
    expect(inner(fixture, 'mp-ribbon-button').getAttribute('label')).toBe('Cut');
  });

  // `disabled` is a boolean attribute on the element: present means disabled.
  // Binding `false` as the string "false" would disable it permanently.
  it('writes disabled as a present-or-absent attribute', async () => {
    const state = { disabled: signal(false) };
    const { fixture } = await render(
      [BsRibbonButtonComponent],
      `<bs-ribbon-button [disabled]="state.disabled()" />`,
      () => state,
    );

    expect(inner(fixture, 'mp-ribbon-button').hasAttribute('disabled')).toBe(false);
    state.disabled.set(true);
    fixture.detectChanges();
    expect(inner(fixture, 'mp-ribbon-button').getAttribute('disabled')).toBe('');
  });

  it.each([
    ['bs-ribbon-button', BsRibbonButtonComponent],
    ['bs-ribbon-toggle-button', BsRibbonToggleButtonComponent],
    ['bs-ribbon-check-box', BsRibbonCheckBoxComponent],
    ['bs-ribbon-combo-box', BsRibbonComboBoxComponent],
    ['bs-ribbon-color-picker', BsRibbonColorPickerComponent],
    ['bs-ribbon-group-button', BsRibbonGroupButtonComponent],
    ['bs-ribbon-dropdown-button', BsRibbonDropdownButtonComponent],
    ['bs-ribbon-split-button', BsRibbonSplitButtonComponent],
    ['bs-ribbon-gallery', BsRibbonGalleryComponent],
    ['bs-ribbon-template-item', BsRibbonTemplateItemComponent],
  ] as const)(
    // FR-5: consumer light-DOM CSS targets `bs-ribbon-button[data-size="large"]`
    // on the WRAPPER host, so the mirror has to exist there and not only on the
    // element inside.
    '%s mirrors size onto its own host as size and data-size',
    async (selector, component) => {
      const { fixture } = await render(
        [component],
        `<${selector} [size]="state.size()" />`,
        () => ({ size: signal<'large' | 'medium' | 'small'>('large') }),
      );

      const host = wrapper(fixture, selector);
      expect(host.getAttribute('size')).toBe('large');
      expect(host.getAttribute('data-size')).toBe('large');
    },
  );

  it('bs-ribbon-gallery forwards its column count', async () => {
    const { fixture } = await render(
      [BsRibbonGalleryComponent],
      `<bs-ribbon-gallery [columns]="state.columns()" />`,
      () => ({ columns: signal(6) }),
    );
    expect(inner(fixture, 'mp-ribbon-gallery').getAttribute('columns')).toBe('6');
  });

  it('bs-ribbon-menu-item forwards its kind and checked state', async () => {
    const { fixture } = await render(
      [BsRibbonMenuItemComponent],
      `<bs-ribbon-menu-item [kind]="state.kind()" [checked]="state.checked()" />`,
      () => ({ kind: signal<'action' | 'checkbox' | 'radio'>('checkbox'), checked: signal(true) }),
    );
    const el = inner(fixture, 'mp-ribbon-menu-item');
    expect(el.getAttribute('kind')).toBe('checkbox');
    expect(el.getAttribute('checked')).toBe('');
  });

  it('bs-ribbon-gallery-item forwards its selected state', async () => {
    const { fixture } = await render(
      [BsRibbonGalleryItemComponent],
      `<bs-ribbon-gallery-item [selected]="state.selected()" />`,
      () => ({ selected: signal(true) }),
    );
    expect(inner(fixture, 'mp-ribbon-gallery-item').getAttribute('selected')).toBe('');
  });

  // Object-valued inputs are set as PROPERTIES, not attributes — an array
  // stringified into an attribute would reach the element as "[object Object]".
  it('bs-ribbon-combo-box passes options as a property', async () => {
    const options = [{ label: 'Arial', value: 'arial' }];
    const { fixture } = await render(
      [BsRibbonComboBoxComponent],
      `<bs-ribbon-combo-box [options]="state.options()" />`,
      () => ({ options: signal(options) }),
    );
    expect((inner(fixture, 'mp-ribbon-combobox') as unknown as { options: unknown }).options)
      .toEqual(options);
  });

  it('bs-ribbon-group-button passes buttons as a property', async () => {
    const buttons = [{ label: 'Left', value: 'left' }];
    const { fixture } = await render(
      [BsRibbonGroupButtonComponent],
      `<bs-ribbon-group-button [buttons]="state.buttons()" />`,
      () => ({ buttons: signal(buttons) }),
    );
    expect((inner(fixture, 'mp-ribbon-group-button') as unknown as { buttons: unknown }).buttons)
      .toEqual(buttons);
  });

  it('bs-quick-access-toolbar forwards label and touch-mode', async () => {
    const { fixture } = await render(
      [BsQuickAccessToolbarComponent],
      `<bs-quick-access-toolbar [label]="state.label()" [touchMode]="state.touchMode()" />`,
      () => ({ label: signal('Favourites'), touchMode: signal<'on' | 'off' | 'auto'>('on') }),
    );
    const el = inner(fixture, 'mp-quick-access-toolbar');
    expect(el.getAttribute('label')).toBe('Favourites');
    expect(el.getAttribute('touch-mode')).toBe('on');
  });

  // A menu item and separator have to land in the host element's `menu` slot,
  // or the dropdown renders an empty panel with the items stacked underneath it.
  it.each([
    ['bs-ribbon-menu-item', BsRibbonMenuItemComponent],
    ['bs-ribbon-menu-separator', BsRibbonMenuSeparatorComponent],
  ] as const)('%s assigns itself to the menu slot', async (selector, component) => {
    const { fixture } = await render([component], `<${selector} />`, () => ({}));
    expect(wrapper(fixture, selector).getAttribute('slot')).toBe('menu');
  });

  it('bs-ribbon-template-item forwards size to the element as well as the host', async () => {
    const { fixture } = await render(
      [BsRibbonTemplateItemComponent],
      `<bs-ribbon-template-item [size]="state.size()" />`,
      () => ({ size: signal<'large' | 'medium' | 'small'>('small') }),
    );
    expect(inner(fixture, 'mp-ribbon-template-item').getAttribute('size')).toBe('small');
  });
});

// ---------------------------------------------------------------------------
// Content projection
// ---------------------------------------------------------------------------

describe('ribbon wrappers — content projection', () => {
  it.each([
    ['bs-ribbon-button', 'mp-ribbon-button', BsRibbonButtonComponent],
    ['bs-ribbon-split-button', 'mp-ribbon-split-button', BsRibbonSplitButtonComponent],
    ['bs-ribbon-dropdown-button', 'mp-ribbon-dropdown-button', BsRibbonDropdownButtonComponent],
    ['bs-ribbon-gallery', 'mp-ribbon-gallery', BsRibbonGalleryComponent],
    ['bs-ribbon-gallery-item', 'mp-ribbon-gallery-item', BsRibbonGalleryItemComponent],
    ['bs-ribbon-menu-item', 'mp-ribbon-menu-item', BsRibbonMenuItemComponent],
    ['bs-ribbon-template-item', 'mp-ribbon-template-item', BsRibbonTemplateItemComponent],
    ['bs-quick-access-toolbar', 'mp-quick-access-toolbar', BsQuickAccessToolbarComponent],
  ] as const)('%s projects content INTO the element', async (selector, tag, component) => {
    const { fixture } = await render(
      [component],
      `<${selector}><i class="projected"></i></${selector}>`,
      () => ({}),
    );
    // Inside the element, not merely inside the wrapper: a projection that lands
    // beside the element is never slotted and never renders.
    expect(inner(fixture, tag).querySelector('.projected')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Event bridging
// ---------------------------------------------------------------------------

describe('ribbon wrappers — event bridging', () => {
  /** Fire the element's custom event the way the web component would. */
  function emit(element: HTMLElement, type: string, detail: unknown) {
    element.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  it.each([
    ['bs-ribbon-button', 'mp-ribbon-button', BsRibbonButtonComponent, 'itemClick', 'item-click', { itemId: 'copy' }],
    ['bs-ribbon-gallery-item', 'mp-ribbon-gallery-item', BsRibbonGalleryItemComponent, 'gallerySelect', 'gallery-select', { itemId: 'h1' }],
    ['bs-ribbon-menu-item', 'mp-ribbon-menu-item', BsRibbonMenuItemComponent, 'menuSelect', 'menu-select', { itemId: 'w', checked: true }],
    ['bs-ribbon-dropdown-button', 'mp-ribbon-dropdown-button', BsRibbonDropdownButtonComponent, 'menuToggle', 'menu-toggle', { itemId: 's', open: true }],
  ] as const)('%s bridges %s', async (selector, tag, component, output, eventName, detail) => {
    const { fixture, host } = await render(
      [component],
      `<${selector} (${output})="record($event)" />`,
      () => ({}),
    );

    emit(inner(fixture, tag), eventName, detail);
    expect(host.events).toEqual([detail]);
  });

  it('bs-ribbon-split-button bridges both of its events', async () => {
    const { fixture, host } = await render(
      [BsRibbonSplitButtonComponent],
      `<bs-ribbon-split-button (mainAction)="record($event)" (menuToggle)="record($event)" />`,
      () => ({}),
    );

    const el = inner(fixture, 'mp-ribbon-split-button');
    emit(el, 'main-action', { itemId: 'paste' });
    emit(el, 'menu-toggle', { itemId: 'paste', open: true });
    expect(host.events).toEqual([{ itemId: 'paste' }, { itemId: 'paste', open: true }]);
  });

  it('emits the event detail, not the event', async () => {
    const { fixture, host } = await render(
      [BsRibbonButtonComponent],
      `<bs-ribbon-button (itemClick)="record($event)" />`,
      () => ({}),
    );
    emit(inner(fixture, 'mp-ribbon-button'), 'item-click', { itemId: 'copy' });
    expect(host.events[0]).not.toBeInstanceOf(Event);
  });
});

// ---------------------------------------------------------------------------
// ControlValueAccessor
// ---------------------------------------------------------------------------

describe('ribbon wrappers — ControlValueAccessor', () => {
  async function renderControl(
    component: Type<unknown>,
    selector: string,
    control: FormControl,
  ) {
    @Component({
      imports: [component, ReactiveFormsModule],
      template: `<${selector} [formControl]="control" />`,
      standalone: true,
    })
    class Harness {
      readonly control = control;
    }

    await TestBed.configureTestingModule({ imports: [Harness] }).compileComponents();
    const fixture = TestBed.createComponent(Harness);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function emit(element: HTMLElement, type: string, detail: unknown) {
    element.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  it.each([
    ['bs-ribbon-toggle-button', 'mp-ribbon-toggle-button', BsRibbonToggleButtonComponent, 'pressed', true, 'toggle', { itemId: 't', pressed: true }],
    ['bs-ribbon-check-box', 'mp-ribbon-checkbox', BsRibbonCheckBoxComponent, 'checked', true, 'check-change', { itemId: 'c', checked: true }],
  ] as const)(
    '%s writes a boolean control value down as an attribute',
    async (selector, tag, component, attribute, _value, _event, _detail) => {
      const control = new FormControl(true);
      const fixture = await renderControl(component, selector, control);
      expect(fixture.nativeElement.querySelector(tag)!.getAttribute(attribute)).toBe('');
    },
  );

  it.each([
    ['bs-ribbon-toggle-button', 'mp-ribbon-toggle-button', BsRibbonToggleButtonComponent, 'toggle', { itemId: 't', pressed: true }, true],
    ['bs-ribbon-check-box', 'mp-ribbon-checkbox', BsRibbonCheckBoxComponent, 'check-change', { itemId: 'c', checked: true }, true],
    ['bs-ribbon-combo-box', 'mp-ribbon-combobox', BsRibbonComboBoxComponent, 'value-change', { itemId: 'f', value: 'arial' }, 'arial'],
    ['bs-ribbon-color-picker', 'mp-ribbon-color-picker', BsRibbonColorPickerComponent, 'color-change', { itemId: 'fg', color: '#ff0000' }, '#ff0000'],
    ['bs-ribbon-group-button', 'mp-ribbon-group-button', BsRibbonGroupButtonComponent, 'group-select', { itemId: 'a', value: 'left' }, 'left'],
  ] as const)(
    '%s pushes a user change up into the form control',
    async (selector, tag, component, eventName, detail, expected) => {
      const control = new FormControl<unknown>(null);
      const fixture = await renderControl(component, selector, control);
      emit(fixture.nativeElement.querySelector(tag)!, eventName, detail);
      expect(control.value).toBe(expected);
    },
  );

  // A control the user has interacted with must become touched, or validation
  // messages gated on `touched` never appear.
  it.each([
    ['bs-ribbon-toggle-button', 'mp-ribbon-toggle-button', BsRibbonToggleButtonComponent, 'toggle', { itemId: 't', pressed: true }],
    ['bs-ribbon-check-box', 'mp-ribbon-checkbox', BsRibbonCheckBoxComponent, 'check-change', { itemId: 'c', checked: true }],
    ['bs-ribbon-combo-box', 'mp-ribbon-combobox', BsRibbonComboBoxComponent, 'value-change', { itemId: 'f', value: 'arial' }],
  ] as const)('%s marks the control touched', async (selector, tag, component, eventName, detail) => {
    const control = new FormControl<unknown>(null);
    const fixture = await renderControl(component, selector, control);
    expect(control.touched).toBe(false);
    emit(fixture.nativeElement.querySelector(tag)!, eventName, detail);
    expect(control.touched).toBe(true);
  });

  it.each([
    ['bs-ribbon-toggle-button', 'mp-ribbon-toggle-button', BsRibbonToggleButtonComponent],
    ['bs-ribbon-check-box', 'mp-ribbon-checkbox', BsRibbonCheckBoxComponent],
    ['bs-ribbon-combo-box', 'mp-ribbon-combobox', BsRibbonComboBoxComponent],
    ['bs-ribbon-color-picker', 'mp-ribbon-color-picker', BsRibbonColorPickerComponent],
    ['bs-ribbon-group-button', 'mp-ribbon-group-button', BsRibbonGroupButtonComponent],
  ] as const)('%s disables the element from the form control', async (selector, tag, component) => {
    const control = new FormControl({ value: null, disabled: true });
    const fixture = await renderControl(component, selector, control);
    expect(fixture.nativeElement.querySelector(tag)!.getAttribute('disabled')).toBe('');
  });

  it('bs-ribbon-color-picker falls back to black on a null control value', async () => {
    const control = new FormControl<string | null>(null);
    const fixture = await renderControl(BsRibbonColorPickerComponent, 'bs-ribbon-color-picker', control);
    expect(fixture.nativeElement.querySelector('mp-ribbon-color-picker')!.getAttribute('color'))
      .toBe('#000000');
  });

  it('bs-ribbon-combo-box falls back to an empty string on a null control value', async () => {
    const control = new FormControl<string | null>(null);
    const fixture = await renderControl(BsRibbonComboBoxComponent, 'bs-ribbon-combo-box', control);
    expect(fixture.nativeElement.querySelector('mp-ribbon-combobox')!.getAttribute('value')).toBe('');
  });
});
