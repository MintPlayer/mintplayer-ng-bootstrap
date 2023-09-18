import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { TrackByRoutingModule } from './track-by-routing.module';
import { TrackByComponent } from './track-by.component';


@NgModule({
  declarations: [
    TrackByComponent
  ],
  imports: [
    CommonModule,
    BsTrackByModule,
    BsGridModule,
    BsButtonTypeModule,
    BsListGroupModule,
    TrackByRoutingModule
  ]
})
export class TrackByModule { }
