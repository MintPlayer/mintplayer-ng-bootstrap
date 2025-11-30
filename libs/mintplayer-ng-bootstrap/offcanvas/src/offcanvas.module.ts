import { Injector, NgModule } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { BsOffcanvasComponent } from './components/offcanvas/offcanvas.component';
import { BsOffcanvasContentDirective } from './directives/offcanvas-content/offcanvas-content.directive';
import { BsOffcanvasHostComponent } from './components/offcanvas-host/offcanvas-host.component';
import { BsOffcanvasCloseDirective } from './directives/offcanvas-close/offcanvas-close.directive';
import { OffcanvasHeaderComponent } from './components/offcanvas-header/offcanvas-header.component';
import { OffcanvasBodyComponent } from './components/offcanvas-body/offcanvas-body.component';
import { PORTAL_FACTORY } from './providers/portal-factory.provider';
import { BsOffcanvasPushDirective } from './directives/offcanvas-push/offcanvas-push.directive';



@NgModule({
  declarations: [
    BsOffcanvasComponent,
    BsOffcanvasContentDirective,
    BsOffcanvasHostComponent,
    BsOffcanvasCloseDirective,
    OffcanvasHeaderComponent,
    OffcanvasBodyComponent,
    BsOffcanvasPushDirective
  ],
  imports: [
    AsyncPipe,
    NgTemplateOutlet,
    OverlayModule,
  ],
  exports: [
    BsOffcanvasComponent,
    BsOffcanvasContentDirective,
    BsOffcanvasHostComponent,
    BsOffcanvasCloseDirective,
    OffcanvasHeaderComponent,
    OffcanvasBodyComponent,
    BsOffcanvasPushDirective
  ],
  providers: [{
    provide: PORTAL_FACTORY,
    useValue: (injector: Injector) => {
      return new ComponentPortal(BsOffcanvasComponent, null, injector);
    }
  }]
})
export class BsOffcanvasModule { }
