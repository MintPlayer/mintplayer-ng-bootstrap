import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridColDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';

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
}
