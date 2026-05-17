import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsOtpInputComponent } from '@mintplayer/ng-bootstrap/otp-input';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-otp-input',
  templateUrl: './otp-input.component.html',
  styleUrls: ['./otp-input.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BsOtpInputComponent, BsCodeSnippetComponent, FocusOnLoadDirective],
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

  protected readonly snippetBasicHtml = dedent`
    <bs-otp-input
      [(ngModel)]="code"
      (complete)="onComplete($event)"
      autofocus>
    </bs-otp-input>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsOtpInputComponent } from '@mintplayer/ng-bootstrap/otp-input';

    @Component({
      selector: 'my-otp',
      templateUrl: './my-otp.component.html',
      imports: [FormsModule, BsOtpInputComponent],
    })
    export class MyOtpComponent {
      readonly code = signal<string | undefined>(undefined);

      onComplete(code: string): void {
        // Fires once when all 6 boxes are filled. Wire to auto-submit.
        this.submit(code);
      }

      private submit(code: string): void { /* … */ }
    }
  `;

  protected readonly snippetGroupedHtml = dedent`
    <!-- Non-uniform layouts via [groups]. Example: MS Office product key
         is 6-6-4-4-6-6 = 32 chars. Paste with dashes — the component
         strips separators and fills correctly. -->
    <bs-otp-input
      [groups]="[6, 6, 4, 4, 6, 6]"
      type="alphanumeric"
      case="upper"
      size="lg"
      [(ngModel)]="productKey">
    </bs-otp-input>
  `;

  protected readonly snippetReactiveTs = dedent`
    // Reactive Forms: bind via [formControl] for validators + touched state.
    readonly otpControl = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    });
  `;

  protected readonly snippetReactiveHtml = dedent`
    <bs-otp-input [formControl]="otpControl"></bs-otp-input>
  `;
}
