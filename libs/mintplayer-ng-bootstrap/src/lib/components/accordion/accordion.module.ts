import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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
    BrowserAnimationsModule
  ],
  exports: [
    BsAccordionComponent,
    BsAccordionTabComponent,
    BsAccordionTabHeaderComponent
  ]
})
export class BsAccordionModule { }
