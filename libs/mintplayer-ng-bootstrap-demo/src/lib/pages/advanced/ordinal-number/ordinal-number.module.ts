import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsOrdinalNumberModule } from '@mintplayer/ng-bootstrap/ordinal-number';

import { OrdinalNumberRoutingModule } from './ordinal-number-routing.module';
import { OrdinalNumberComponent } from './ordinal-number.component';


@NgModule({
  declarations: [
    OrdinalNumberComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsOrdinalNumberModule,
    OrdinalNumberRoutingModule
  ]
})
export class OrdinalNumberModule { }
