import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap';

import { ButtonGroupRoutingModule } from './button-group-routing.module';
import { ButtonGroupComponent } from './button-group.component';


@NgModule({
  declarations: [
    ButtonGroupComponent
  ],
  imports: [
    CommonModule,
    BsButtonGroupModule,
    ButtonGroupRoutingModule
  ]
})
export class ButtonGroupModule { }
