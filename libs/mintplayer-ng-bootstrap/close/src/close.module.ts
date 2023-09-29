import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCloseComponent } from './button/close.component';
import { BsContentTemplateDirective } from './content-template/content-template.directive';

@NgModule({
  declarations: [BsCloseComponent, BsContentTemplateDirective],
  imports: [CommonModule],
  exports: [BsCloseComponent, BsContentTemplateDirective],
})
export class BsCloseModule {}
