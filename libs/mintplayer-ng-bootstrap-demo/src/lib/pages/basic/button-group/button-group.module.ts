import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';

import { ButtonGroupRoutingModule } from './button-group-routing.module';
import { ButtonGroupComponent } from './button-group.component';


@NgModule({
  declarations: [
    ButtonGroupComponent
  ],
  imports: [
    CommonModule,
    BsButtonTypeModule,
    BsButtonGroupModule,
    ButtonGroupRoutingModule
  ]
})
export class ButtonGroupModule { }
