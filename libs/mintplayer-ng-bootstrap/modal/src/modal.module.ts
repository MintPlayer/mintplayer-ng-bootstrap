import { NgModule } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsOverlayComponent, BsOverlayContentDirective } from '@mintplayer/ng-bootstrap/overlay';
import { BsModalComponent } from './components/modal/modal.component';
import { BsModalHostComponent } from './components/modal-host/modal-host.component';
import { BsModalHeaderDirective } from './directives/modal-header/modal-header.directive';
import { BsModalBodyDirective } from './directives/modal-body/modal-body.directive';
import { BsModalFooterDirective } from './directives/modal-footer/modal-footer.directive';
import { BsModalDirective } from './directives/modal/modal.directive';
import { BsModalCloseDirective } from './directives/modal-close/modal-close.directive';

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
    NgTemplateOutlet,
    OverlayModule,
    BsOverlayComponent,
    BsOverlayContentDirective
  ],
  exports: [
    BsModalHeaderDirective,
    BsModalBodyDirective,
    BsModalFooterDirective,
    BsModalDirective,
    BsModalCloseDirective,
    BsModalComponent,
    BsModalHostComponent,
    BsOverlayContentDirective
  ]
})
export class BsModalModule { }
