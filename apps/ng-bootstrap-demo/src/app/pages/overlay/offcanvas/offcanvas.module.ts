import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap';

import { OffcanvasRoutingModule } from './offcanvas-routing.module';
import { OffcanvasComponent } from './offcanvas.component';


@NgModule({
  declarations: [
    OffcanvasComponent
  ],
  imports: [
    CommonModule,
    BsOffcanvasModule,
    OffcanvasRoutingModule
  ]
})
export class OffcanvasModule { }
