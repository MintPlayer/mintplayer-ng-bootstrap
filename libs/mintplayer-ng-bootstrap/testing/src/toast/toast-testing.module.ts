import { Injector, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAddPropertiesPipe, BsToastService } from '@mintplayer/ng-bootstrap/toast';
import { ComponentPortal } from '@angular/cdk/portal';
import { BsToastContainerMockComponent } from './toast-container/toast-container.component';
import { BsToastHeaderMockComponent } from './components/toast-header/toast-header.component';
import { BsToastBodyMockComponent } from './components/toast-body/toast-body.component';
import { BsToastMockService } from './service/toast.service';
import { PORTAL_FACTORY } from './providers/portal-factory.provider';
import { BsAddPropertiesMockPipe } from './pipes/add-properties.pipe';

@NgModule({
  declarations: [
    BsToastContainerMockComponent,
    BsToastBodyMockComponent,
    BsToastHeaderMockComponent,
    BsToastBodyMockComponent,
    BsAddPropertiesMockPipe,
  ],
  imports: [CommonModule],
  exports: [
    BsToastContainerMockComponent,
    BsToastBodyMockComponent,
    BsToastHeaderMockComponent,
    BsToastBodyMockComponent,
    BsAddPropertiesMockPipe,
  ],
  providers: [
    { provide: BsToastService, useClass: BsToastMockService },
    { provide: BsAddPropertiesPipe, useClass: BsAddPropertiesMockPipe },
    {
      provide: PORTAL_FACTORY,
      useValue: (injector: Injector) => {
        return new ComponentPortal(BsToastContainerMockComponent, null, injector);
      }
    }
  ]
})
export class BsToastTestingModule {}
