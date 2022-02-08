import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsOffcanvasHeaderComponent } from './components/offcanvas-header/offcanvas-header.component';
import { BsOffcanvasBodyComponent } from './components/offcanvas-body/offcanvas-body.component';
import { BsOffcanvasComponent } from './components/offcanvas/offcanvas.component';
import { BsOffcanvasCloseDirective } from './directives/offcanvas-close/offcanvas-close.directive';



@NgModule({
  declarations: [
    BsOffcanvasComponent,
    BsOffcanvasHeaderComponent,
    BsOffcanvasBodyComponent,
    BsOffcanvasCloseDirective
  ],
  imports: [
    CommonModule,
    OverlayModule
  ],
  exports: [
    BsOffcanvasComponent,
    BsOffcanvasHeaderComponent,
    BsOffcanvasBodyComponent,
    BsOffcanvasCloseDirective
  ]
})
export class BsOffcanvasModule { }
