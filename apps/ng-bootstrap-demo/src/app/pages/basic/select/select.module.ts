import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule, BsSelectModule } from '@mintplayer/ng-bootstrap';

import { SelectRoutingModule } from './select-routing.module';
import { SelectComponent } from './select.component';


@NgModule({
  declarations: [
    SelectComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsGridModule,
    BsSelectModule,
    SelectRoutingModule
  ]
})
export class SelectModule { }
