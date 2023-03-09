import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsPlaceholderModule } from '@mintplayer/ng-bootstrap/placeholder';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { PlaceholderRoutingModule } from './placeholder-routing.module';
import { PlaceholderComponent } from './placeholder.component';


@NgModule({
  declarations: [
    PlaceholderComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsGridModule,
    BsCardModule,
    BsAlertModule,
    BsPlaceholderModule,
    BsToggleButtonModule,
    PlaceholderRoutingModule
  ]
})
export class PlaceholderModule { }
