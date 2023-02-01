import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { ColorTransitionRoutingModule } from './color-transition-routing.module';
import { ColorTransitionComponent } from './color-transition.component';


@NgModule({
  declarations: [
    ColorTransitionComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsToggleButtonModule,
    ColorTransitionRoutingModule
  ]
})
export class ColorTransitionModule { }
