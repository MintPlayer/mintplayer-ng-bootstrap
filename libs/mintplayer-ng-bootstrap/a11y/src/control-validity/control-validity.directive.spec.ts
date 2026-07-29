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

@Component({
  selector: 'error-message-harness',
  imports: [BsCheckboxComponent, ReactiveFormsModule],
  template: `<bs-checkbox [formControl]="control" [errorMessages]="messages">Accept</bs-checkbox>`,
})
class ErrorMessageHarnessComponent {
  control = new FormControl(false, { validators: [Validators.requiredTrue] });
  messages: Record<string, string> = { required: 'Accept the terms to continue.' };
}

/**
 * The `error-text` half of the mirror: the message the WC renders inside its shadow
 * root and points its inner `<input>` at with `aria-errormessage` +
 * `aria-describedby`.
 *
 * It rides the same touched-and-invalid predicate as `invalid`, which is not an
 * implementation detail — `aria-errormessage` is only defined while the control is
 * `aria-invalid`, so a message written any earlier would be a reference the WC
 * cannot legally emit.
 */
describe('BsControlValidityDirective error messages', () => {
  let fixture: ComponentFixture<ErrorMessageHarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ErrorMessageHarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(ErrorMessageHarnessComponent);
    fixture.detectChanges();
  });

  const wc = () => fixture.nativeElement.querySelector('mp-checkbox') as HTMLElement;

  it('writes nothing while the control is untouched, like invalid', () => {
    expect(wc().hasAttribute('error-text')).toBe(false);
  });

  it('writes the message for the active error once touched', () => {
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();

    expect(wc().getAttribute('error-text')).toBe('Accept the terms to continue.');
    // On the WC, not on the bs-* host: the host has no role to read it from, and
    // the directive finds the WC as the wrapper's first element child.
    const wrapper = fixture.nativeElement.querySelector('bs-checkbox') as HTMLElement;
    expect(wrapper.hasAttribute('error-text')).toBe(false);
    expect(wrapper.firstElementChild).toBe(wc());
  });

  it('removes the message again when the control becomes valid', () => {
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();
    fixture.componentInstance.control.setValue(true);
    fixture.detectChanges();

    expect(wc().hasAttribute('error-text')).toBe(false);
    expect(wc().hasAttribute('invalid')).toBe(false);
  });

  it('stays silent for an error key with no message, rather than inventing one', () => {
    fixture.componentInstance.messages = {};
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();

    expect(wc().hasAttribute('error-text')).toBe(false);
    // The control is still flagged — a message is an enhancement, not the flag.
    expect(wc().hasAttribute('invalid')).toBe(true);
  });
});
