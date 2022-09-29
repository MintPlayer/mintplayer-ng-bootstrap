import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBadgeModule } from '@mintplayer/ng-bootstrap';

import { BadgeRoutingModule } from './badge-routing.module';
import { BadgeComponent } from './badge.component';


@NgModule({
  declarations: [
    BadgeComponent
  ],
  imports: [
    CommonModule,
    BsBadgeModule,
    BadgeRoutingModule
  ]
})
export class BadgeModule { }
