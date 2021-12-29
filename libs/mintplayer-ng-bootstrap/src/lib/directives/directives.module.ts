import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContentTemplateDirective } from './content-template/content-template.directive';



@NgModule({
  declarations: [
    BsContentTemplateDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsContentTemplateDirective
  ]
})
export class BsDirectivesModule { }
