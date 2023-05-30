import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCopyModule } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
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
    BsOffcanvasModule,
    HighlightModule,
    CopyRoutingModule
  ]
})
export class CopyModule { }
