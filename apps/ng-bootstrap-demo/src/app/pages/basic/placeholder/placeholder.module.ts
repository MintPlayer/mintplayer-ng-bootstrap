import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsAlertModule, BsCardModule, BsGridModule, BsPlaceholderModule } from '@mintplayer/ng-bootstrap';

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
    PlaceholderRoutingModule
  ]
})
export class PlaceholderModule { }
