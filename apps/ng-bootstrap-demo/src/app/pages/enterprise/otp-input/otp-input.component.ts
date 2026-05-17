import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsOtpInputComponent } from '@mintplayer/ng-bootstrap/otp-input';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

@Component({
  selector: 'demo-otp-input',
  templateUrl: './otp-input.component.html',
  styleUrls: ['./otp-input.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BsOtpInputComponent, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpInputDemoComponent {
  // Classic OTP — template-driven with auto-submit on complete.
  readonly classicCode = signal<string | undefined>(undefined);
  readonly classicSubmitted = signal<string | null>(null);
  onClassicComplete(code: string): void { this.classicSubmitted.set(code); }
  clearClassic(): void { this.classicCode.set(''); this.classicSubmitted.set(null); }

  // 4-digit PIN.
  readonly pinGroups = [1, 1, 1, 1];
  readonly pinCode = signal<string>('');

  // MS Office product key (6-6-4-4-6-6 = 32 chars).
  readonly officeGroups = [6, 6, 4, 4, 6, 6];
  readonly officeKey = signal<string>('');

  // Windows product key (5-5-5-5-5 = 25 chars).
  readonly windowsGroups = [5, 5, 5, 5, 5];
  readonly windowsKey = signal<string>('');

  // Reactive forms with validation: required + minLength(6).
  readonly validationForm = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(6)],
  });
}
