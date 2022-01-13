import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap';

import { AccordionRoutingModule } from './accordion-routing.module';
import { AccordionComponent } from './accordion.component';


@NgModule({
  declarations: [
    AccordionComponent
  ],
  imports: [
    CommonModule,
    BsAccordionModule,
    AccordionRoutingModule
  ]
})
export class AccordionModule { }
