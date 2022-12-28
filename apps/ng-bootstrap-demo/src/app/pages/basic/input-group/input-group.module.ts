import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { InputGroupRoutingModule } from './input-group-routing.module';
import { InputGroupComponent } from './input-group.component';


@NgModule({
  declarations: [
    InputGroupComponent
  ],
  imports: [
    CommonModule,
    BsFormModule,
    BsInputGroupModule,
    BsButtonTypeModule,
    InputGroupRoutingModule
  ]
})
export class InputGroupModule { }
