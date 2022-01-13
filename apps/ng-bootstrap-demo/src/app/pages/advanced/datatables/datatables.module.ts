import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatatableModule } from '@mintplayer/ng-bootstrap';

import { DatatablesRoutingModule } from './datatables-routing.module';
import { DatatablesComponent } from './datatables.component';


@NgModule({
  declarations: [
    DatatablesComponent
  ],
  imports: [
    CommonModule,
    BsDatatableModule,
    DatatablesRoutingModule
  ]
})
export class DatatablesModule { }
