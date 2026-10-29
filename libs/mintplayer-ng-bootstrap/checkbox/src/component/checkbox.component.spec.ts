import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { BsCheckboxComponent } from './checkbox.component';
import { BsCheckboxType } from '../types/checkbox-type';

/** Inputs are driven from signals (CLAUDE.md: a mutated plain field does not propagate). */
@Component({
  imports: [BsCheckboxComponent],
  template: `
    <bs-checkbox [type]="type()" [(isToggled)]="checked" [(indeterminate)]="mixed" name="terms" value="yes"
      aria-label="Accept the terms" aria-describedby="hint" id="terms" tabindex="-1">Accept</bs-checkbox>
    <span id="hint">Hint</span>
  `,
})
class HostComponent {
  type = signal<BsCheckboxType>('checkbox');
  checked = signal<boolean | null>(false);
  mixed = signal(false);
}

describe('BsCheckboxComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const host = () => fixture.nativeElement.querySelector('bs-checkbox') as HTMLElement;
  const input = () => host().querySelector('input') as HTMLInputElement;
  const label = () => host().querySelector('label') as HTMLLabelElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders a native checkbox in a .form-check label, no custom element', () => {
    expect(host().querySelector('mp-checkbox')).toBeNull();
    expect(label().classList.contains('form-check')).toBe(true);
    expect(input().type).toBe('checkbox');
    expect(input().classList.contains('form-check-input')).toBe(true);
    expect(input().name).toBe('terms');
    expect(input().value).toBe('yes');
    expect(label().querySelector('.form-check-label')?.textContent?.trim()).toBe('Accept');
    expect(input().hasAttribute('role')).toBe(false);
  });

  it('moves id/tabindex and copies aria-* from the host onto the input', () => {
    expect(input().id).toBe('terms');
    expect(input().getAttribute('tabindex')).toBe('-1');
    expect(input().getAttribute('aria-label')).toBe('Accept the terms');
    expect(input().getAttribute('aria-describedby')).toBe('hint');
    expect(host().hasAttribute('id')).toBe(false);
    expect(host().hasAttribute('tabindex')).toBe(false);
  });

  it('two-way binds the checked state', () => {
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    expect(input().checked).toBe(true);

    input().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('carries the mixed state as the property and aria-checked; a toggle clears it', () => {
    fixture.componentInstance.mixed.set(true);
    fixture.detectChanges();
    expect(input().indeterminate).toBe(true);
    expect(input().getAttribute('aria-checked')).toBe('mixed');

    input().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mixed()).toBe(false);
    expect(input().hasAttribute('aria-checked')).toBe(false);
  });

  it('a switch is role=switch inside .form-switch', () => {
    fixture.componentInstance.type.set('switch');
    fixture.detectChanges();
    expect(label().classList.contains('form-switch')).toBe(true);
    expect(input().getAttribute('role')).toBe('switch');
  });

  it('a toggle button is a .btn-check input + label[for], keeping the native checkbox role', () => {
    fixture.componentInstance.type.set('toggle_button');
    fixture.detectChanges();
    expect(input().classList.contains('btn-check')).toBe(true);
    expect(label().classList.contains('btn')).toBe(true);
    expect(label().classList.contains('btn-primary')).toBe(true);
    expect(label().htmlFor).toBe(input().id);
    expect(input().hasAttribute('role')).toBe(false);
    expect(input().hasAttribute('aria-pressed')).toBe(false);
    expect(input().checked).toBe(false);

    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    expect(input().checked).toBe(true);
  });
});

@Component({
  imports: [BsCheckboxComponent],
  template: `<bs-toggle-button [(isToggled)]="on" color="outline-success">Bold</bs-toggle-button>`,
})
class ToggleHostComponent {
  on = signal<boolean | null>(false);
}

describe('bs-toggle-button', () => {
  it('is the toggle-button front: btn-check input + label.btn, whatever [type] says', () => {
    const fixture = TestBed.createComponent(ToggleHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('bs-toggle-button') as HTMLElement;
    const input = host.querySelector('input') as HTMLInputElement;
    const label = host.querySelector('label') as HTMLLabelElement;
    expect(input.classList.contains('btn-check')).toBe(true);
    expect(label.className).toBe('btn btn-outline-success');
    expect(label.htmlFor).toBe(input.id);

    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(input.checked).toBe(true);
  });
});
