import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OverlayRoutingModule } from './overlay-routing.module';
import { OverlayComponent } from './overlay.component';


@NgModule({
  declarations: [
    OverlayComponent
  ],
  imports: [
    CommonModule,
    OverlayRoutingModule
  ]
})
export class OverlayModule { }
