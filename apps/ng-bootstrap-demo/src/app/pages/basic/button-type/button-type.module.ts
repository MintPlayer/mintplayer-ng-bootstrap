import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { ButtonTypeRoutingModule } from './button-type-routing.module';
import { ButtonTypeComponent } from './button-type.component';


@NgModule({
  declarations: [
    ButtonTypeComponent
  ],
  imports: [
    CommonModule,
    BsTrackByModule,
    BsButtonTypeModule,
    ButtonTypeRoutingModule
  ]
})
export class ButtonTypeModule { }
