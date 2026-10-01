import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { MpCheckbox } from '@mintplayer/web-components/checkbox';
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
  const box = () => fixture.nativeElement.querySelector('mp-checkbox') as MpCheckbox;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('writes the form value to the element', () => {
    expect(box().checked).toBe(true);
    fixture.componentInstance.ctrl.setValue(false);
    fixture.detectChanges();
    expect(box().checked).toBe(false);
  });

  it('reports the checked state from the element\'s change event', () => {
    box().dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { checked: false, indeterminate: false } }));
    expect(fixture.componentInstance.ctrl.value).toBe(false);
  });

  it('disables the element with the control', () => {
    fixture.componentInstance.ctrl.disable();
    expect(box().disabled).toBe(true);
    fixture.componentInstance.ctrl.enable();
    expect(box().disabled).toBe(false);
  });

  it('marks the control touched on focusout', () => {
    box().dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
    expect(fixture.componentInstance.ctrl.touched).toBe(true);
  });
});
