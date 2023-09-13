import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsSplitStringModule } from '@mintplayer/ng-bootstrap/split-string';

import { SplitStringRoutingModule } from './split-string-routing.module';
import { SplitStringComponent } from './split-string.component';


@NgModule({
  declarations: [
    SplitStringComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsGridModule,
    BsListGroupModule,
    BsSplitStringModule,
    SplitStringRoutingModule
  ]
})
export class SplitStringModule { }
