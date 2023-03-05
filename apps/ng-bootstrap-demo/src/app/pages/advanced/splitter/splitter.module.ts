import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
    BsSplitterModule,
    SplitterRoutingModule
  ]
})
export class SplitterModule { }
