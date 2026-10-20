import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsCheckboxComponent } from '../component/checkbox.component';
import { BsCheckboxValueAccessor } from './checkbox-value-accessor';

@Component({
  template: `<bs-checkbox [formControl]="ctrl">Accept</bs-checkbox>`,
  imports: [ReactiveFormsModule, BsCheckboxComponent, BsCheckboxValueAccessor],
})
class HostComponent {
  readonly ctrl = new FormControl<boolean>(true, { nonNullable: true });
}

describe('BsCheckboxValueAccessor', () => {
  let fixture: ComponentFixture<HostComponent>;
  const box = () => fixture.nativeElement.querySelector('input[type=checkbox]') as HTMLInputElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('writes the form value to the input', () => {
    expect(box().checked).toBe(true);
    fixture.componentInstance.ctrl.setValue(false);
    fixture.detectChanges();
    expect(box().checked).toBe(false);
  });

  it('reports the checked state from the native toggle', () => {
    box().click();
    expect(fixture.componentInstance.ctrl.value).toBe(false);
    box().click();
    expect(fixture.componentInstance.ctrl.value).toBe(true);
  });

  it('disables the input with the control', () => {
    fixture.componentInstance.ctrl.disable();
    fixture.detectChanges();
    expect(box().disabled).toBe(true);
    fixture.componentInstance.ctrl.enable();
    fixture.detectChanges();
    expect(box().disabled).toBe(false);
  });

  it('marks the control touched on focusout', () => {
    box().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(fixture.componentInstance.ctrl.touched).toBe(true);
  });
});
