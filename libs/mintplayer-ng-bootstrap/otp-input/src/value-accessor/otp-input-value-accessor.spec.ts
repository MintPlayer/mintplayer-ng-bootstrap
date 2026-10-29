import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsOtpInputComponent } from '../generated';

/**
 * The accessor of the generated `bs-otp-input` (#437): the real input renders in
 * the component's light DOM, so typing reaches the form through the `value`
 * model, and a form write shows in the field without echoing back as a change.
 */

@Component({
  imports: [BsOtpInputComponent, ReactiveFormsModule],
  template: `<bs-otp-input [formControl]="ctrl" aria-label="Code"></bs-otp-input>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<string>('12');
}

async function create(): Promise<ComponentFixture<ReactiveHost>> {
  const f = TestBed.createComponent(ReactiveHost);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const inner = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('bs-otp-input input') as HTMLInputElement;

describe('BsOtpInputValueAccessor with Angular forms', () => {
  it('shows the form value in the input, named by the host aria-label, and stays pristine', async () => {
    const f = await create();
    expect(inner(f).value).toBe('12');
    expect(inner(f).getAttribute('aria-label')).toBe('Code');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('reports typing to the form, filtered', async () => {
    const f = await create();
    inner(f).value = '12a34';
    inner(f).dispatchEvent(new InputEvent('input', { bubbles: true }));
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.ctrl.value).toBe('1234');
    expect(f.componentInstance.ctrl.dirty).toBe(true);
  });

  it('a later form write reaches the field without marking it dirty', async () => {
    const f = await create();
    f.componentInstance.ctrl.setValue('987');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(inner(f).value).toBe('987');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('disables the input with the control', async () => {
    const f = await create();
    f.componentInstance.ctrl.disable();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(inner(f).disabled).toBe(true);
  });

  it('marks the control touched on focusout', async () => {
    const f = await create();
    inner(f).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(f.componentInstance.ctrl.touched).toBe(true);
  });
});
