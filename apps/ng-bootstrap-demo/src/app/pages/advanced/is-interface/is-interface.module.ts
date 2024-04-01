import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { IsInterfaceRoutingModule } from './is-interface-routing.module';
import { IsInterfaceComponent } from './is-interface.component';


@NgModule({
  declarations: [
    IsInterfaceComponent
  ],
  imports: [
    CommonModule,
    BsButtonTypeModule,
    IsInterfaceRoutingModule
  ]
})
export class IsInterfaceModule { }
