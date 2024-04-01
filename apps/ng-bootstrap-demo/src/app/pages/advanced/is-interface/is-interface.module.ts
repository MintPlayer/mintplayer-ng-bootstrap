import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IsInterfaceRoutingModule } from './is-interface-routing.module';
import { IsInterfaceComponent } from './is-interface.component';


@NgModule({
  declarations: [
    IsInterfaceComponent
  ],
  imports: [
    CommonModule,
    IsInterfaceRoutingModule
  ]
})
export class IsInterfaceModule { }
