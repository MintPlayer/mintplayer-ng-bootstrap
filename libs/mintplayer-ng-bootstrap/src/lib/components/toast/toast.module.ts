import { Injector, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsToastComponent } from './components/toast/toast.component';
import { BsToastBodyComponent } from './components/toast-body/toast-body.component';
import { BsToastHeaderComponent } from './components/toast-header/toast-header.component';
import { BsToastContainerComponent } from './components/toast-container/toast-container.component';
import { PORTAL_FACTORY } from './providers/portal-factory.provider';
import { ComponentPortal } from '@angular/cdk/portal';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsToastService } from './services/toast/toast.service';
import { BsToastCloseDirective } from './directives/toast-close/toast-close.directive';
import { BsAddPropertiesModule } from '../../pipes/add-properties/add-properties.module';

@NgModule({
  declarations: [
    BsToastComponent,
    BsToastBodyComponent,
    BsToastHeaderComponent,
    BsToastContainerComponent,
    BsToastCloseDirective,
  ],
  imports: [
    CommonModule,
    OverlayModule,
    BsAddPropertiesModule
  ],
  exports: [
    BsToastComponent,
    BsToastBodyComponent,
    BsToastHeaderComponent,
    BsToastContainerComponent,
    BsToastCloseDirective,
  ],
  providers: [
    {
      provide: PORTAL_FACTORY,
      useValue: (injector: Injector) => {
        return new ComponentPortal(BsToastContainerComponent, null, injector);
      }
    },
    BsToastService
  ]
})
export class BsToastModule {}
