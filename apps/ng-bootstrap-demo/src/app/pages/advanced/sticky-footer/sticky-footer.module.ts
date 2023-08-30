import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsStickyFooterModule } from '@mintplayer/ng-bootstrap/sticky-footer';

import { StickyFooterRoutingModule } from './sticky-footer-routing.module';
import { StickyFooterComponent } from './sticky-footer.component';


@NgModule({
  declarations: [
    StickyFooterComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsStickyFooterModule,
    StickyFooterRoutingModule
  ]
})
export class StickyFooterModule { }
