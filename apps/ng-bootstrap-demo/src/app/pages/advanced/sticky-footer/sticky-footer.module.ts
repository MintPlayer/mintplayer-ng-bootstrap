import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
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
    BsTrackByModule,
    BsAccordionModule,
    BsStickyFooterModule,
    StickyFooterRoutingModule
  ]
})
export class StickyFooterModule { }
