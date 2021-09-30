import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AccordionComponent } from './accordion/accordion.component';
import { AccordionTabComponent } from './accordion-tab/accordion-tab.component';

@NgModule({
  declarations: [
    AccordionComponent,
    AccordionTabComponent
  ],
  imports: [
    CommonModule,
    BrowserAnimationsModule
  ],
  exports: [
    AccordionComponent,
    AccordionTabComponent
  ]
})
export class BsAccordionModule { }
