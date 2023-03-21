import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsInstanceOfDirective } from './directives/instanceof.directive';
import { BsInstanceofCaseDirective } from './directives/instanceof-case.directive';
import { BsInstanceOfDefaultDirective } from './directives/instanceof-default.directive';
import { BsInstanceofPipe } from './pipes/instance-of.pipe';

@NgModule({
  declarations: [
    BsInstanceofPipe,
    BsInstanceOfDirective,
    BsInstanceofCaseDirective,
    BsInstanceOfDefaultDirective
  ],
  imports: [CommonModule],
  exports: [
    BsInstanceofPipe,
    BsInstanceOfDirective,
    BsInstanceofCaseDirective,
    BsInstanceOfDefaultDirective
  ]
})
export class BsInstanceOfModule { }
