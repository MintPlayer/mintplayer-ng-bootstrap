import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAccordionModule, BsCloseModule, BsDropdownMenuModule, BsDropdownModule, BsGridModule, BsOffcanvasModule } from '@mintplayer/ng-bootstrap';

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
    BsDropdownMenuModule,
    BsOffcanvasModule,
    BsAccordionModule,
    OffcanvasRoutingModule
  ]
})
export class OffcanvasModule { }
