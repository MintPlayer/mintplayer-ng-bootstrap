import { Injector, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsModalComponent } from './components/modal/modal.component';
import { BsModalHostComponent } from './components/modal-host/modal-host.component';
import { BsModalHeaderDirective } from './directives/modal-header/modal-header.directive';
import { BsModalBodyDirective } from './directives/modal-body/modal-body.directive';
import { BsModalFooterDirective } from './directives/modal-footer/modal-footer.directive';
import { BsModalDirective } from './directives/modal/modal.directive';
import { BsModalCloseDirective } from './directives/modal-close/modal-close.directive';
import { PORTAL_FACTORY } from './providers/portal-factory.provider';
import { ComponentPortal } from '@angular/cdk/portal';

@NgModule({
  declarations: [
    BsModalHeaderDirective,
    BsModalBodyDirective,
    BsModalFooterDirective,
    BsModalDirective,
    BsModalCloseDirective,
    BsModalComponent,
    BsModalHostComponent
  ],
  imports: [
    CommonModule,
    OverlayModule
  ],
  exports: [
    BsModalHeaderDirective,
    BsModalBodyDirective,
    BsModalFooterDirective,
    BsModalDirective,
    BsModalCloseDirective,
    BsModalComponent,
    BsModalHostComponent
  ],
  providers: [{
    provide: PORTAL_FACTORY,
    useValue: (injector: Injector) => {
      return new ComponentPortal(BsModalComponent, null, injector);
    }
  }]
})
export class BsModalModule { }
