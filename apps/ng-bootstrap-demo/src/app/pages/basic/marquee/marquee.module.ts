import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsMarqueeModule } from '@mintplayer/ng-bootstrap/marquee';

import { MarqueeRoutingModule } from './marquee-routing.module';
import { MarqueeComponent } from './marquee.component';


@NgModule({
  declarations: [
    MarqueeComponent
  ],
  imports: [
    CommonModule,
    BsMarqueeModule,
    MarqueeRoutingModule
  ]
})
export class MarqueeModule { }
