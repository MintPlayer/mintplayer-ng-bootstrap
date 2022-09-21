import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSpinnerModule } from '@mintplayer/ng-bootstrap';

import { SpinnerRoutingModule } from './spinner-routing.module';
import { SpinnerComponent } from './spinner.component';


@NgModule({
  declarations: [
    SpinnerComponent
  ],
  imports: [
    CommonModule,
    BsSpinnerModule,
    SpinnerRoutingModule
  ]
})
export class SpinnerModule { }
