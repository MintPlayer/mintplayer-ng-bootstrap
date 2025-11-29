import { NgModule } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsOffcanvasComponent } from './components/offcanvas/offcanvas.component';
import { BsOffcanvasContentDirective } from './directives/offcanvas-content/offcanvas-content.directive';
import { BsOffcanvasHostComponent } from './components/offcanvas-host/offcanvas-host.component';
import { BsOffcanvasCloseDirective } from './directives/offcanvas-close/offcanvas-close.directive';
import { OffcanvasHeaderComponent } from './components/offcanvas-header/offcanvas-header.component';
import { OffcanvasBodyComponent } from './components/offcanvas-body/offcanvas-body.component';
import { BsOverlayComponent, BsOverlayContentDirective } from '@mintplayer/ng-bootstrap/overlay';
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
    BsOverlayComponent,
    BsOverlayContentDirective
  ],
  exports: [
    BsOffcanvasComponent,
    BsOffcanvasContentDirective,
    BsOffcanvasHostComponent,
    BsOffcanvasCloseDirective,
    OffcanvasHeaderComponent,
    OffcanvasBodyComponent,
    BsOffcanvasPushDirective,
    BsOverlayContentDirective
  ]
})
export class BsOffcanvasModule { }
