import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { SelectRoutingModule } from './select-routing.module';
import { SelectComponent } from './select.component';


@NgModule({
  declarations: [
    SelectComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsGridModule,
    BsSelectModule,
    BsTrackByModule,
    BsToggleButtonModule,
    SelectRoutingModule
  ]
})
export class SelectModule { }
