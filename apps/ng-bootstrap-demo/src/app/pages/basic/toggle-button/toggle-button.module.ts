import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { ToggleButtonRoutingModule } from './toggle-button-routing.module';
import { ToggleButtonComponent } from './toggle-button.component';


@NgModule({
  declarations: [
    ToggleButtonComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsGridModule,
    BsToggleButtonModule,
    ToggleButtonRoutingModule
  ]
})
export class ToggleButtonModule { }
