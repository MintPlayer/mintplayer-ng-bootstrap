import { NgModule } from '@angular/core';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsAccordionComponent } from './accordion/accordion.component';
import { BsAccordionTabComponent } from './accordion-tab/accordion-tab.component';
import { BsAccordionTabHeaderComponent } from './accordion-tab-header/accordion-tab-header.component';
import { AsyncPipe } from '@angular/common';

@NgModule({
  declarations: [
    BsAccordionComponent,
    BsAccordionTabComponent,
    BsAccordionTabHeaderComponent
  ],
  imports: [
    AsyncPipe,
    BsNoNoscriptDirective
  ],
  exports: [
    BsAccordionComponent,
    BsAccordionTabComponent,
    BsAccordionTabHeaderComponent
  ]
})
export class BsAccordionModule { }
