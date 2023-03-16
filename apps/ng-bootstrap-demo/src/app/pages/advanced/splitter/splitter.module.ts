import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsSplitterModule } from '@mintplayer/ng-bootstrap/splitter';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

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
    BsToggleButtonModule,
    SplitterRoutingModule
  ]
})
export class SplitterModule { }
