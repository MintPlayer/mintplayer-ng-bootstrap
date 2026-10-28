import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsPhoneInputComponent } from '../generated';

@Component({
  imports: [BsPhoneInputComponent, ReactiveFormsModule],
  template: `<bs-phone-input [formControl]="ctrl" defaultCountry="be" aria-label="Mobile" [errorMessages]="{ required: 'Needed' }"></bs-phone-input>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<string | null>('+32470123456', Validators.required);
}

@Component({
  imports: [BsPhoneInputComponent, FormsModule],
  template: `<bs-phone-input [(ngModel)]="phone" defaultCountry="be" [allowedCountries]="only()"></bs-phone-input>`,
})
class TemplateHost {
  readonly phone = signal<string | null>(null);
  readonly only = signal<string[] | null>(null);
}

async function create<T>(type: new () => T): Promise<ComponentFixture<T>> {
  const f = TestBed.createComponent(type);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const tel = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('bs-phone-input input[type=tel]') as HTMLInputElement;
const picker = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('bs-phone-input select') as HTMLSelectElement;

function type(input: HTMLInputElement, value: string) {
  input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
  input.value = value;
  input.setSelectionRange(value.length, value.length);
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

describe('BsPhoneInputValueAccessor with reactive forms', () => {
  it('decomposes the form value into country and digits, named by the host aria-label, and stays pristine', async () => {
    const f = await create(ReactiveHost);
    expect(picker(f).value).toBe('be');
    expect(tel(f).value.replace(/\D/g, '')).toBe('470123456');
    expect(tel(f).getAttribute('aria-label')).toBe('Mobile');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('reports typing to the form as E.164', async () => {
    const f = await create(ReactiveHost);
    type(tel(f), '+31 612345678');
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.ctrl.value).toBe('+31612345678');
    expect(picker(f).value).toBe('nl');
    expect(f.componentInstance.ctrl.dirty).toBe(true);
  });

  it('disables both controls with the form control', async () => {
    const f = await create(ReactiveHost);
    f.componentInstance.ctrl.disable();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect([tel(f).disabled, picker(f).disabled]).toEqual([true, true]);
  });

  it('shows the form error on the number field once touched', async () => {
    const f = await create(ReactiveHost);
    f.componentInstance.ctrl.setValue(null);
    f.componentInstance.ctrl.markAsTouched();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(tel(f).getAttribute('aria-invalid')).toBe('true');
    const id = tel(f).getAttribute('aria-errormessage')!;
    expect(document.getElementById(id)?.textContent?.trim()).toBe('Needed');
  });

  it('marks the control touched on focusout', async () => {
    const f = await create(ReactiveHost);
    tel(f).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(f.componentInstance.ctrl.touched).toBe(true);
  });
});

describe('BsPhoneInputValueAccessor with template-driven forms', () => {
  it('writes ngModel down and reads a country pick back', async () => {
    const f = await create(TemplateHost);
    f.componentInstance.phone.set('+32470123456');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(tel(f).value.replace(/\D/g, '')).toBe('470123456');
    expect(picker(f).value).toBe('be');

    picker(f).value = 'nl';
    picker(f).dispatchEvent(new Event('change', { bubbles: true }));
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.phone()).toBe('+31470123456');
  });

  it('offers only the allowed countries, given as an array', async () => {
    const f = await create(TemplateHost);
    f.componentInstance.only.set(['be', 'nl']);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect([...picker(f).options].map((o) => o.value).sort()).toEqual(['be', 'nl']);
  });
});
