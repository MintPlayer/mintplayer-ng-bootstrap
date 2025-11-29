import { NgModule } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsOverlayComponent } from '@mintplayer/ng-bootstrap/overlay';
import { BsToastComponent } from './components/toast/toast.component';
import { BsToastBodyComponent } from './components/toast-body/toast-body.component';
import { BsToastHeaderComponent } from './components/toast-header/toast-header.component';
import { BsToastContainerComponent } from './components/toast-container/toast-container.component';
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
    BsOverlayComponent,
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
    BsToastService
  ]
})
export class BsToastModule {}
