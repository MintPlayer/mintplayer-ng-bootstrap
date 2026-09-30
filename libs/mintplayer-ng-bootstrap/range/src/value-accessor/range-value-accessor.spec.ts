import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsRangeComponent } from '../component/range.component';

@Component({
  template: `<bs-range [formControl]="ctrl" [min]="0" [max]="10" [step]="0.5" ariaLabel="Volume"></bs-range>`,
  imports: [ReactiveFormsModule, BsRangeComponent],
})
class HostComponent {
  readonly ctrl = new FormControl<number | null>(4);
}

describe('BsRangeValueAccessor', () => {
  let fixture: ComponentFixture<HostComponent>;
  const slider = () => fixture.nativeElement.querySelector('input[type=range]') as HTMLInputElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders a named range input and writes the form value to it', () => {
    expect(slider().getAttribute('aria-label')).toBe('Volume');
    expect(slider().value).toBe('4');
    fixture.componentInstance.ctrl.setValue(7.5);
    expect(slider().value).toBe('7.5');
  });

  it('ignores a non-numeric form value', () => {
    fixture.componentInstance.ctrl.setValue(null);
    expect(slider().value).toBe('4');
  });

  it('reports the slider position as a number while it moves', () => {
    slider().value = '2.5';
    slider().dispatchEvent(new Event('input', { bubbles: true }));
    expect(fixture.componentInstance.ctrl.value).toBe(2.5);
  });

  it('disables the slider with the control, and marks it touched on focusout', () => {
    fixture.componentInstance.ctrl.disable();
    expect(slider().disabled).toBe(true);
    fixture.componentInstance.ctrl.enable();
    expect(slider().disabled).toBe(false);
    slider().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(fixture.componentInstance.ctrl.touched).toBe(true);
  });
});
