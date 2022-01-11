import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsModalHeaderDirective } from './directives/modal-header/modal-header.directive';
import { BsModalBodyDirective } from './directives/modal-body/modal-body.directive';
import { BsModalFooterDirective } from './directives/modal-footer/modal-footer.directive';
import { BsModalContentComponent } from './component/modal-content/modal-content.component';
import { BsModalComponent } from '../modal/component/modal/modal.component';

@NgModule({
  declarations: [
    BsModalHeaderDirective,
    BsModalBodyDirective,
    BsModalFooterDirective,
    BsModalComponent,
    BsModalContentComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsModalHeaderDirective,
    BsModalBodyDirective,
    BsModalFooterDirective,
    BsModalComponent
  ]
})
export class BsModalModule { }
