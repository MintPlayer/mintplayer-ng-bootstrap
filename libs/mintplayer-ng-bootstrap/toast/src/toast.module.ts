import { Injector, NgModule } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { ComponentPortal } from '@angular/cdk/portal';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsToastComponent } from './components/toast/toast.component';
import { BsToastBodyComponent } from './components/toast-body/toast-body.component';
import { BsToastHeaderComponent } from './components/toast-header/toast-header.component';
import { BsToastContainerComponent } from './components/toast-container/toast-container.component';
import { PORTAL_FACTORY } from './providers/portal-factory.provider';
import { BsToastService } from './services/toast/toast.service';
import { BsToastCloseDirective } from './directives/toast-close/toast-close.directive';
import { BsAddPropertiesPipe } from './pipes/add-properties.pipe';

@NgModule({
  declarations: [
    BsToastComponent,
    BsToastBodyComponent,
    BsToastHeaderComponent,
    BsToastContainerComponent,
    BsToastCloseDirective,
    BsAddPropertiesPipe,
  ],
  imports: [
    AsyncPipe,
    OverlayModule,
    NgTemplateOutlet,
    BsHasOverlayComponent,
  ],
  exports: [
    BsToastComponent,
    BsToastBodyComponent,
    BsToastHeaderComponent,
    BsToastContainerComponent,
    BsToastCloseDirective,
    BsAddPropertiesPipe,
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
