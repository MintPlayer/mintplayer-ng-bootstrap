import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap';

import { ProgressBarRoutingModule } from './progress-bar-routing.module';
import { ProgressBarComponent } from './progress-bar.component';


@NgModule({
  declarations: [
    ProgressBarComponent
  ],
  imports: [
    CommonModule,
    BsProgressBarModule,
    ProgressBarRoutingModule
  ]
})
export class ProgressBarModule { }
