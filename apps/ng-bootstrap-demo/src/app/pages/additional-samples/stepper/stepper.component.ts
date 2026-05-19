import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridColDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-stepper',
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.scss'],
  imports: [
    CdkStepperModule,
    NgTemplateOutlet,
    ReactiveFormsModule,
    BsAlertComponent,
    BsButtonTypeDirective,
    BsCodeSnippetComponent,
    BsFormComponent,
    BsFormControlDirective,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperComponent {
  colors = Color;

  readonly signupStepper = viewChild.required<CdkStepper>('signupStepper');
  readonly checkoutStepper = viewChild.required<CdkStepper>('checkoutStepper');

  readonly isSignupLastStep = computed(() => {
    const s = this.signupStepper();
    return s.selectedIndex === s.steps.length - 1;
  });
  readonly isCheckoutLastStep = computed(() => {
    const s = this.checkoutStepper();
    return s.selectedIndex === s.steps.length - 1;
  });

  // Linear · Horizontal — signup wizard
  signupAccount = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  signupAddress = new FormGroup({
    street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    zip: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  // Linear · Vertical — checkout
  checkoutContact = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  checkoutShipping = new FormGroup({
    method: new FormControl('standard', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true }),
  });
  checkoutPayment = new FormGroup({
    cardholder: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    cardNumber: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(12)] }),
  });

  resetSignupForms() {
    this.signupAccount.reset();
    this.signupAddress.reset();
  }

  resetCheckoutForms() {
    this.checkoutContact.reset();
    this.checkoutShipping.reset();
    this.checkoutPayment.reset();
  }

  protected readonly snippetBasicHtml = dedent`
    <div cdkStepper #stepper="cdkStepper" [linear]="true" orientation="horizontal">
      <cdk-step [stepControl]="accountForm" label="Account">
        <form [formGroup]="accountForm">
          <input formControlName="name" placeholder="Name">
          <input formControlName="email" placeholder="Email" type="email">
        </form>
      </cdk-step>
      <cdk-step label="Review">
        <p>Confirm your details and submit.</p>
      </cdk-step>

      <div class="step-headers">
        @for (step of stepper.steps; track $index) {
          <button cdkStepHeader type="button"
                  [disabled]="stepper.linear && $index > stepper.selectedIndex && !step.completed"
                  (click)="stepper.selectedIndex = $index">
            {{ step.label }}
          </button>
        }
      </div>

      <div class="step-body">
        @if (stepper.selected) {
          <ng-container [ngTemplateOutlet]="stepper.selected.content"></ng-container>
        }
      </div>

      <button cdkStepperPrevious [color]="colors.secondary">Back</button>
      <button cdkStepperNext [color]="colors.primary">Next</button>
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { CdkStepperModule } from '@angular/cdk/stepper';
    import { NgTemplateOutlet } from '@angular/common';
    import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

    @Component({
      selector: 'my-stepper-demo',
      templateUrl: './my-stepper-demo.component.html',
      imports: [CdkStepperModule, NgTemplateOutlet, ReactiveFormsModule, BsButtonTypeDirective],
    })
    export class MyStepperDemoComponent {
      protected readonly colors = Color;

      accountForm = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      });
    }
  `;

  protected readonly snippetVariantsHtml = dedent`
    <!-- Linear ⇒ Next is disabled until the active step's form is valid.
         orientation flips the header layout horizontal ↔ vertical. -->

    <!-- Linear · Horizontal — signup wizard, gated by form validity. -->
    <div cdkStepper [linear]="true" orientation="horizontal">…</div>

    <!-- Linear · Vertical — checkout flow, each step body renders inline
         under its own header. -->
    <div cdkStepper [linear]="true" orientation="vertical">…</div>

    <!-- Non-linear · Horizontal — free navigation; users may skip steps. -->
    <div cdkStepper [linear]="false" orientation="horizontal">…</div>

    <!-- Non-linear · Vertical — settings panel; click any header to expand. -->
    <div cdkStepper [linear]="false" orientation="vertical">…</div>
  `;
}
