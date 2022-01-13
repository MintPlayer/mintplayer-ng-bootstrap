import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCopyModule, BsSnackbarModule } from '@mintplayer/ng-bootstrap';
import { HighlightModule } from 'ngx-highlightjs';

import { CopyRoutingModule } from './copy-routing.module';
import { CopyComponent } from './copy.component';


@NgModule({
  declarations: [
    CopyComponent
  ],
  imports: [
    CommonModule,
    BsCopyModule,
    BsSnackbarModule,
    HighlightModule,
    CopyRoutingModule
  ]
})
export class CopyModule { }
