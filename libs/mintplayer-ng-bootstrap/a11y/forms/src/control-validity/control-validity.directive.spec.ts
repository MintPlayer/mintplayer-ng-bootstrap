import { Component, signal } from '@angular/core';
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

/**
 * bs-checkbox renders its own native input (#437), so the directive's state
 * reaches AT through the front's attribute bag on that input — the
 * role-bearing node — and never as attributes on the bs-* host.
 */
describe('BsControlValidityDirective (via bs-checkbox)', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;

  it('an untouched invalid control is NOT flagged — pristine forms must not scream', () => {
    expect(fixture.componentInstance.control.invalid).toBe(true);
    expect(input().hasAttribute('aria-invalid')).toBe(false);
  });

  it('invalid appears once the control is touched, and clears when it becomes valid', () => {
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();
    expect(input().getAttribute('aria-invalid')).toBe('true');

    fixture.componentInstance.control.setValue(true);
    fixture.detectChanges();
    expect(input().hasAttribute('aria-invalid')).toBe(false);
  });

  it('required mirrors the validator', () => {
    expect(input().required).toBe(true);
    expect(input().getAttribute('aria-required')).toBe('true');
  });

  it('writes nothing onto the bs-* host', () => {
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('bs-checkbox') as HTMLElement;
    expect(['invalid', 'required', 'error-text'].filter((name) => host.hasAttribute(name))).toEqual([]);
  });
});

@Component({
  selector: 'error-message-harness',
  imports: [BsCheckboxComponent, ReactiveFormsModule],
  template: `<bs-checkbox [formControl]="control" [errorMessages]="messages()">Accept</bs-checkbox>`,
})
class ErrorMessageHarnessComponent {
  control = new FormControl(false, { validators: [Validators.requiredTrue] });
  messages = signal<Record<string, string>>({ required: 'Accept the terms to continue.' });
}

/**
 * The message rides the same touched-and-invalid predicate as `invalid`, which
 * is not an implementation detail — `aria-errormessage` is only defined while
 * the control is `aria-invalid`, so a message any earlier would be a reference
 * the control cannot legally carry.
 */
describe('BsControlValidityDirective error messages', () => {
  let fixture: ComponentFixture<ErrorMessageHarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ErrorMessageHarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(ErrorMessageHarnessComponent);
    fixture.detectChanges();
  });

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const feedback = () => fixture.nativeElement.querySelector('.invalid-feedback') as HTMLElement | null;

  it('renders no message while the control is untouched, like invalid', () => {
    expect(feedback()).toBeNull();
    expect(input().hasAttribute('aria-errormessage')).toBe(false);
  });

  it('renders the message for the active error once touched, referenced from the input', () => {
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();

    const message = feedback()!;
    expect(message.textContent?.trim()).toBe('Accept the terms to continue.');
    expect(input().getAttribute('aria-errormessage')).toBe(message.id);
    expect(input().getAttribute('aria-describedby')).toBe(message.id);
  });

  it('removes the message again when the control becomes valid', () => {
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();
    fixture.componentInstance.control.setValue(true);
    fixture.detectChanges();

    expect(feedback()).toBeNull();
    expect(input().hasAttribute('aria-invalid')).toBe(false);
  });

  it('stays silent for an error key with no message, rather than inventing one', () => {
    fixture.componentInstance.messages.set({});
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();

    expect(feedback()).toBeNull();
    // The control is still flagged — a message is an enhancement, not the flag.
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });
});
