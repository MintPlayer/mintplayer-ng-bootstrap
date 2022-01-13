import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCalendarModule, BsDropdownModule } from '@mintplayer/ng-bootstrap';

import { DropdownRoutingModule } from './dropdown-routing.module';
import { DropdownComponent } from './dropdown.component';


@NgModule({
  declarations: [
    DropdownComponent
  ],
  imports: [
    CommonModule,
    BsCalendarModule,
    BsDropdownModule,
    DropdownRoutingModule
  ]
})
export class DropdownModule { }
