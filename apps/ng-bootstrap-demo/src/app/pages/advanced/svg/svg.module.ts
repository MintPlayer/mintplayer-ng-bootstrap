import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSvgModule } from '@mintplayer/ng-bootstrap/svg';

import { SvgRoutingModule } from './svg-routing.module';
import { SvgComponent } from './svg.component';


@NgModule({
  declarations: [
    SvgComponent
  ],
  imports: [
    CommonModule,
    BsSvgModule,
    SvgRoutingModule
  ]
})
export class SvgModule { }
