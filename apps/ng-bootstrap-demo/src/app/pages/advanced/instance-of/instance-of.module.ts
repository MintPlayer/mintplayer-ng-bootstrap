import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsInstanceOfModule } from '@mintplayer/ng-bootstrap/instance-of';

import { InstanceOfRoutingModule } from './instance-of-routing.module';
import { InstanceOfComponent } from './instance-of.component';


@NgModule({
  declarations: [
    InstanceOfComponent
  ],
  imports: [
    CommonModule,
    BsInstanceOfModule,
    InstanceOfRoutingModule
  ]
})
export class InstanceOfModule { }
