import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSpinnerModule } from '@mintplayer/ng-bootstrap/spinner';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';

import { SpinnerRoutingModule } from './spinner-routing.module';
import { SpinnerComponent } from './spinner.component';


@NgModule({
  declarations: [
    SpinnerComponent
  ],
  imports: [
    CommonModule,
    BsSpinnerModule,
    BsTrackByModule,
    SpinnerRoutingModule
  ]
})
export class SpinnerModule { }
