import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import { BsModalHeaderDirective } from './directives/modal-header/modal-header.directive';
import { BsModalBodyDirective } from './directives/modal-body/modal-body.directive';
import { BsModalFooterDirective } from './directives/modal-footer/modal-footer.directive';
import { BsModalComponent } from './components/modal/modal.component';
import { BsModalHostComponent } from './components/modal-host/modal-host.component';
import { BsModalCloseDirective } from './directives/modal-close/modal-close.directive';

@NgModule({
  declarations: [
    BsModalHeaderDirective,
    BsModalBodyDirective,
    BsModalFooterDirective,
    BsModalComponent,
    BsModalHostComponent,
    BsModalCloseDirective
  ],
  imports: [
    CommonModule,
    A11yModule,
    OverlayModule
  ],
  exports: [
    BsModalHeaderDirective,
    BsModalBodyDirective,
    BsModalFooterDirective,
    BsModalComponent,
    BsModalHostComponent,
    BsModalCloseDirective
  ]
})
export class BsModalModule { }
