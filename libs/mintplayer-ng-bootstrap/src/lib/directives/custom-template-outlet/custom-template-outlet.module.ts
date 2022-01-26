import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomTemplateOutletDirective } from './custom-template-outlet.directive';

@NgModule({
  declarations: [
    CustomTemplateOutletDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    CustomTemplateOutletDirective
  ]
})
export class CustomTemplateOutletModule { }
