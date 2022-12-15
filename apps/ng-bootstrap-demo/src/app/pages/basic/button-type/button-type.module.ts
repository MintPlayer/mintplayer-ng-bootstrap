import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { ButtonTypeRoutingModule } from './button-type-routing.module';
import { ButtonTypeComponent } from './button-type.component';


@NgModule({
  declarations: [
    ButtonTypeComponent
  ],
  imports: [
    CommonModule,
    BsButtonTypeModule,
    ButtonTypeRoutingModule
  ]
})
export class ButtonTypeModule { }
