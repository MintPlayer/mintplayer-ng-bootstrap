import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAccordionComponent } from './accordion/accordion.component';
import { BsAccordionTabComponent } from './accordion-tab/accordion-tab.component';
import { BsAccordionTabHeaderComponent } from './accordion-tab-header/accordion-tab-header.component';
import { BsFromOverlayDirective } from './from-overlay/from-overlay.directive';
import { BsFromOverlayIdDirective } from './from-overlay-id/from-overlay-id.directive';

@NgModule({
  declarations: [
    BsAccordionComponent,
    BsAccordionTabComponent,
    BsAccordionTabHeaderComponent,
    BsFromOverlayDirective,
    BsFromOverlayIdDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsAccordionComponent,
    BsAccordionTabComponent,
    BsAccordionTabHeaderComponent,
    BsFromOverlayDirective,
    BsFromOverlayIdDirective
  ]
})
export class BsAccordionModule { }
