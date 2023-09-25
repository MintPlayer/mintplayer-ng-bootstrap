import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsLinifyModule } from '@mintplayer/ng-bootstrap/linify';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { LinifyRoutingModule } from './linify-routing.module';
import { LinifyComponent } from './linify.component';


@NgModule({
  declarations: [
    LinifyComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsGridModule,
    BsLinifyModule,
    BsListGroupModule,
    BsToggleButtonModule,
    LinifyRoutingModule
  ]
})
export class LinifyModule { }
