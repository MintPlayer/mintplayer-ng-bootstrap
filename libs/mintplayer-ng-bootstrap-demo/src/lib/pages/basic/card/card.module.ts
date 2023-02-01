import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';

import { CardRoutingModule } from './card-routing.module';
import { CardComponent } from './card.component';


@NgModule({
  declarations: [
    CardComponent
  ],
  imports: [
    CommonModule,
    BsCardModule,
    BsListGroupModule,
    CardRoutingModule
  ]
})
export class CardModule { }
