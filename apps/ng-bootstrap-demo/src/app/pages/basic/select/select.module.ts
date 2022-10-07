import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSelectModule } from '@mintplayer/ng-bootstrap';

import { SelectRoutingModule } from './select-routing.module';
import { SelectComponent } from './select.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    SelectComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsSelectModule,
    SelectRoutingModule
  ]
})
export class SelectModule { }
