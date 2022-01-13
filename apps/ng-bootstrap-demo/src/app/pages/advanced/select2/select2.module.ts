import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFontColorPipeModule, BsSelect2Module } from '@mintplayer/ng-bootstrap';

import { Select2RoutingModule } from './select2-routing.module';
import { Select2Component } from './select2.component';


@NgModule({
  declarations: [
    Select2Component
  ],
  imports: [
    CommonModule,
    BsSelect2Module,
    BsFontColorPipeModule,
    Select2RoutingModule
  ]
})
export class Select2Module { }
