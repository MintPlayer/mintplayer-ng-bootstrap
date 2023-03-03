import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSplitterModule } from '@mintplayer/ng-bootstrap/splitter';

import { SplitterRoutingModule } from './splitter-routing.module';
import { SplitterComponent } from './splitter.component';


@NgModule({
  declarations: [
    SplitterComponent
  ],
  imports: [
    CommonModule,
    BsSplitterModule,
    SplitterRoutingModule
  ]
})
export class SplitterModule { }
