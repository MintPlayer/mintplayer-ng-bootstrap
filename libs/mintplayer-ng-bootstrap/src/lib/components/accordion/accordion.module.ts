import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AccordionComponent } from './accordion/accordion.component';
import { AccordionTabComponent } from './accordion-tab/accordion-tab.component';
import { AccordionTabHeaderComponent } from './accordion-tab-header/accordion-tab-header.component';

@NgModule({
  declarations: [
    AccordionComponent,
    AccordionTabComponent,
    AccordionTabHeaderComponent
  ],
  imports: [
    CommonModule,
    BrowserAnimationsModule
  ],
  exports: [
    AccordionComponent,
    AccordionTabComponent,
    AccordionTabHeaderComponent
  ]
})
export class BsAccordionModule { }
