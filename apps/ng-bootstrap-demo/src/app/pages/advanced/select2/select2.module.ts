import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFontColorModule } from '@mintplayer/ng-bootstrap/font-color';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';

import { Select2RoutingModule } from './select2-routing.module';
import { Select2Component } from './select2.component';


@NgModule({
  declarations: [
    Select2Component
  ],
  imports: [
    CommonModule,
    BsSelect2Module,
    BsFontColorModule,
    Select2RoutingModule
  ]
})
export class Select2Module { }
