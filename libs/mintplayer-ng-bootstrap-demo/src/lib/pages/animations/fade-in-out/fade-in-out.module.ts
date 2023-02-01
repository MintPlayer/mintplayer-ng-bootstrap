import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { FadeInOutRoutingModule } from './fade-in-out-routing.module';
import { FadeInOutComponent } from './fade-in-out.component';


@NgModule({
  declarations: [
    FadeInOutComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsButtonTypeModule,
    BsToggleButtonModule,
    FadeInOutRoutingModule
  ]
})
export class FadeInOutModule { }
