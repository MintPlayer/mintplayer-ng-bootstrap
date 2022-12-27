import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsCloseModule } from '@mintplayer/ng-bootstrap/close';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

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
    BsButtonTypeModule,
    BsButtonGroupModule,
    BsDropdownMenuModule,
    BsOffcanvasModule,
    BsAccordionModule,
    BsToggleButtonModule,
    OffcanvasRoutingModule
  ]
})
export class OffcanvasModule { }
