import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsHasPropertyDirective } from './directives';
// import { BsInstanceofCaseDirective } from './directives/has-property-name.directive';
// import { BsInstanceOfDefaultDirective } from './directives/instanceof-default.directive';
// import { BsInstanceofPipe } from './pipes/has-property.pipe';

@NgModule({
  declarations: [
    // BsInstanceofPipe,
    BsHasPropertyDirective,
    // BsInstanceofCaseDirective,
    // BsInstanceOfDefaultDirective
  ],
  imports: [CommonModule],
  exports: [
    // BsInstanceofPipe,
    BsHasPropertyDirective,
    // BsInstanceofCaseDirective,
    // BsInstanceOfDefaultDirective
  ]
})
export class BsHasPropertyModule { }
