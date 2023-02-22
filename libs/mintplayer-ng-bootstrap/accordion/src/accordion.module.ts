import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsNoNoscriptModule } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsAccordionComponent } from './accordion/accordion.component';
import { BsAccordionTabComponent } from './accordion-tab/accordion-tab.component';
import { BsAccordionTabHeaderComponent } from './accordion-tab-header/accordion-tab-header.component';

@NgModule({
  declarations: [
    BsAccordionComponent,
    BsAccordionTabComponent,
    BsAccordionTabHeaderComponent
  ],
  imports: [
    CommonModule,
    BsNoNoscriptModule
  ],
  exports: [
    BsAccordionComponent,
    BsAccordionTabComponent,
    BsAccordionTabHeaderComponent
  ]
})
export class BsAccordionModule { }
