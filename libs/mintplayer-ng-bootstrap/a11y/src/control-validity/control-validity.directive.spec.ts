import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

@Component({
  selector: 'validity-harness',
  imports: [BsCheckboxComponent, ReactiveFormsModule],
  template: `<bs-checkbox [formControl]="control">Accept</bs-checkbox>`,
})
class HarnessComponent {
  control = new FormControl(false, { validators: [Validators.requiredTrue] });
}

describe('BsControlValidityDirective (via bs-checkbox)', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  const wc = () => fixture.nativeElement.querySelector('mp-checkbox') as HTMLElement;

  it('an untouched invalid control is NOT flagged — pristine forms must not scream', () => {
    expect(fixture.componentInstance.control.invalid).toBe(true);
    expect(wc().hasAttribute('invalid')).toBe(false);
  });

  it('invalid appears once the control is touched, and clears when it becomes valid', () => {
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();
    expect(wc().hasAttribute('invalid')).toBe(true);

    fixture.componentInstance.control.setValue(true);
    fixture.detectChanges();
    expect(wc().hasAttribute('invalid')).toBe(false);
  });

  it('required mirrors the validator', () => {
    expect(wc().hasAttribute('required')).toBe(true);
  });
});
