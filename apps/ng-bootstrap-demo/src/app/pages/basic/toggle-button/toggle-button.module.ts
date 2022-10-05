import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule, BsToggleButtonModule } from '@mintplayer/ng-bootstrap';

import { ToggleButtonRoutingModule } from './toggle-button-routing.module';
import { ToggleButtonComponent } from './toggle-button.component';


@NgModule({
  declarations: [
    ToggleButtonComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsToggleButtonModule,
    ToggleButtonRoutingModule
  ]
})
export class ToggleButtonModule { }
