import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAccordionModule, BsCloseModule, BsDropdownModule, BsGridModule, BsOffcanvasModule } from '@mintplayer/ng-bootstrap';

import { OffcanvasRoutingModule } from './offcanvas-routing.module';
import { OffcanvasComponent } from './offcanvas.component';


@NgModule({
  declarations: [
    OffcanvasComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsCloseModule,
    BsDropdownModule,
    BsOffcanvasModule,
    BsAccordionModule,
    OffcanvasRoutingModule
  ]
})
export class OffcanvasModule { }
