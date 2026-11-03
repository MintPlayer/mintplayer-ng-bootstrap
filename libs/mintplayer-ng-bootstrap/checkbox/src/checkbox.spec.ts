import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BsCheckboxComponent, BsCheckboxGroupComponent, BsToggleButtonComponent } from './generated';
import { BsCheckboxGroupDirective } from './directives';

/**
 * The generated `bs-checkbox` / `bs-toggle-button` / `bs-checkbox-group` and the
 * Angular-only attribute form `[bsCheckboxGroup]` (#458 M4). Hosts drive inputs
 * through signals: a plain-field write notifies nothing under signal-based
 * change detection (CLAUDE.md).
 */

const boxes = (root: Element, selector = '') => [...root.querySelectorAll<HTMLInputElement>(`${selector} input[type=checkbox]`)];

function toggle(input: HTMLInputElement): void {
  input.click();
}

async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [FormsModule, BsCheckboxComponent, BsToggleButtonComponent],
  template: `
    <bs-checkbox id="plain" name="agree" [(ngModel)]="agreed">I agree</bs-checkbox>
    <bs-checkbox id="switch" type="switch" [(checked)]="dark">Dark</bs-checkbox>
    <bs-checkbox id="mixed" [(indeterminate)]="mixed">All</bs-checkbox>
    <bs-toggle-button id="bold" color="outline-success" [(checked)]="bold">Bold</bs-toggle-button>`,
})
class SingleHost {
  readonly agreed = signal(true);
  readonly dark = signal(false);
  readonly mixed = signal(true);
  readonly bold = signal(false);
}

@Component({
  imports: [ReactiveFormsModule, BsCheckboxComponent],
  template: `<bs-checkbox [formControl]="accept">Accept</bs-checkbox>`,
})
class ReactiveHost {
  readonly accept = new FormControl(false, { nonNullable: true });
}

@Component({
  imports: [FormsModule, BsCheckboxComponent, BsCheckboxGroupComponent],
  template: `
    <bs-checkbox-group name="toppings" aria-label="Toppings" [(ngModel)]="toppings">
      <bs-checkbox value="ham">Ham</bs-checkbox>
      <bs-checkbox value="cheese">Cheese</bs-checkbox>
      <bs-checkbox value="olives">Olives</bs-checkbox>
    </bs-checkbox-group>`,
})
class GroupHost {
  readonly toppings = signal<string[]>(['cheese']);
}

@Component({
  imports: [ReactiveFormsModule, BsCheckboxComponent, BsCheckboxGroupDirective],
  template: `
    <div id="plain" bsCheckboxGroup name="toppings" [formControl]="ctrl">
      <bs-checkbox value="ham">Ham</bs-checkbox>
      <bs-checkbox value="cheese">Cheese</bs-checkbox>
      <bs-checkbox value="olives">Olives</bs-checkbox>
    </div>
    <div id="roled" bsCheckboxGroup role="list"></div>
    <table>
      <tbody bsCheckboxGroup name="rows" [formControl]="rows">
        <tr><td><bs-checkbox value="r1" inputLabel="Select row 1" /></td></tr>
        <tr><td><bs-checkbox value="r2" inputLabel="Select row 2" /></td></tr>
      </tbody>
    </table>`,
})
class DirectiveHost {
  readonly ctrl = new FormControl<string[] | null>(['cheese']);
  readonly rows = new FormControl<string[]>([], { nonNullable: true });
}

describe('bs-checkbox / bs-toggle-button (generated)', () => {
  let fixture: ComponentFixture<SingleHost>;
  const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  const input = (id: string) => el(id).querySelector('input') as HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SingleHost] }).compileComponents();
    fixture = TestBed.createComponent(SingleHost);
    await settle(fixture);
  });

  it('renders Bootstrap form-check markup on the host, the label naming the input', () => {
    const host = el('plain');
    expect(host.classList.contains('form-check')).toBe(true);
    expect(host.getAttribute('data-mps')).toBe('checkbox');
    expect(input('plain').classList.contains('form-check-input')).toBe(true);
    expect(input('plain').name).toBe('agree');
    expect(host.querySelector(':scope > label.form-check-label')?.getAttribute('for')).toBe(input('plain').id);
  });

  it('follows and writes back ngModel', async () => {
    expect(input('plain').checked).toBe(true);
    toggle(input('plain'));
    await settle(fixture);
    expect(fixture.componentInstance.agreed()).toBe(false);
    fixture.componentInstance.agreed.set(true);
    await settle(fixture);
    expect(input('plain').checked).toBe(true);
  });

  it('a switch carries the switch role; [(checked)] is two-way', async () => {
    expect(el('switch').classList.contains('form-switch')).toBe(true);
    expect(input('switch').getAttribute('role')).toBe('switch');
    toggle(input('switch'));
    await settle(fixture);
    expect(fixture.componentInstance.dark()).toBe(true);
  });

  it('the mixed state is aria-checked=mixed and the property; a user toggle clears it', async () => {
    expect(input('mixed').getAttribute('aria-checked')).toBe('mixed');
    expect(input('mixed').indeterminate).toBe(true);
    toggle(input('mixed'));
    await settle(fixture);
    expect(fixture.componentInstance.mixed()).toBe(false);
    expect(input('mixed').hasAttribute('aria-checked')).toBe(false);
  });

  it('a toggle button is btn-check + label.btn and keeps the native checkbox role', async () => {
    const host = el('bold');
    expect(host.classList.contains('checkbox-toggle')).toBe(true);
    expect(input('bold').classList.contains('btn-check')).toBe(true);
    expect(input('bold').hasAttribute('role')).toBe(false);
    expect(host.querySelector('label')?.className).toContain('btn btn-outline-success');
    toggle(input('bold'));
    await settle(fixture);
    expect(fixture.componentInstance.bold()).toBe(true);
  });
});

describe('bs-checkbox with a reactive form control', () => {
  it('follows the control, reports to it and disables with it', async () => {
    await TestBed.configureTestingModule({ imports: [ReactiveHost] }).compileComponents();
    const fixture = TestBed.createComponent(ReactiveHost);
    await settle(fixture);
    const input = boxes(fixture.nativeElement)[0];

    fixture.componentInstance.accept.setValue(true);
    await settle(fixture);
    expect(input.checked).toBe(true);

    toggle(input);
    expect(fixture.componentInstance.accept.value).toBe(false);

    fixture.componentInstance.accept.disable();
    await settle(fixture);
    expect(input.disabled).toBe(true);
  });
});

describe('bs-checkbox-group (generated)', () => {
  let fixture: ComponentFixture<GroupHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GroupHost] }).compileComponents();
    fixture = TestBed.createComponent(GroupHost);
    await settle(fixture);
  });

  it('is a named group whose checkboxes submit as an array field', () => {
    const group = fixture.nativeElement.querySelector('bs-checkbox-group') as HTMLElement;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Toppings');
    expect(boxes(group).map((b) => b.name)).toEqual(['toppings[]', 'toppings[]', 'toppings[]']);
    expect(boxes(group).map((b) => b.checked)).toEqual([false, true, false]);
  });

  it('reports the checked values in declaration order', async () => {
    const [ham, cheese, olives] = boxes(fixture.nativeElement);
    toggle(olives);
    await settle(fixture);
    toggle(ham);
    await settle(fixture);
    expect(fixture.componentInstance.toppings()).toEqual(['ham', 'cheese', 'olives']);
    toggle(cheese);
    await settle(fixture);
    expect(fixture.componentInstance.toppings()).toEqual(['ham', 'olives']);
  });
});

describe('[bsCheckboxGroup] (attribute form)', () => {
  let fixture: ComponentFixture<DirectiveHost>;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DirectiveHost] }).compileComponents();
    fixture = TestBed.createComponent(DirectiveHost);
    await settle(fixture);
  });

  it('claims role=group on a generic host only, never over a consumer role or a structural host', () => {
    expect(root().querySelector('#plain')?.getAttribute('role')).toBe('group');
    expect(root().querySelector('#roled')?.getAttribute('role')).toBe('list');
    expect(root().querySelector('tbody')?.hasAttribute('role')).toBe(false);
  });

  it('follows the form array; a null value clears every box', async () => {
    expect(boxes(root(), '#plain').map((b) => b.checked)).toEqual([false, true, false]);
    fixture.componentInstance.ctrl.setValue(null);
    await settle(fixture);
    expect(boxes(root(), '#plain').some((b) => b.checked)).toBe(false);
  });

  it('reports toggles and disables every box with the control', async () => {
    toggle(boxes(root(), '#plain')[0]);
    expect(fixture.componentInstance.ctrl.value).toEqual(['ham', 'cheese']);
    fixture.componentInstance.ctrl.disable();
    await settle(fixture);
    expect(boxes(root(), '#plain').every((b) => b.disabled)).toBe(true);
  });

  it('a table row selection on the tbody: named rows, labelled inputs, its own value', async () => {
    const rows = boxes(root(), 'tbody');
    expect(rows.map((b) => b.name)).toEqual(['rows[]', 'rows[]']);
    expect(rows[1].getAttribute('aria-label')).toBe('Select row 2');
    toggle(rows[1]);
    await settle(fixture);
    expect(fixture.componentInstance.rows.value).toEqual(['r2']);
    expect(fixture.componentInstance.ctrl.value).toEqual(['cheese']);
  });

  it('marks the control touched on focusout', () => {
    root().querySelector('#plain')?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(fixture.componentInstance.ctrl.touched).toBe(true);
  });
});
