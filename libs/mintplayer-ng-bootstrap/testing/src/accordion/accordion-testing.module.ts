import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAccordionComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsAccordionMockComponent } from './accordion/accordion.component';
import { BsAccordionTabMockComponent } from './accordion-tab/accordion-tab.component';
import { BsAccordionTabHeaderMockComponent } from './accordion-tab-header/accordion-tab-header.component';

@NgModule({
  declarations: [
    BsAccordionMockComponent,
    BsAccordionTabMockComponent,
    BsAccordionTabHeaderMockComponent,
  ],
  imports: [CommonModule],
  exports: [
    BsAccordionMockComponent,
    BsAccordionTabMockComponent,
    BsAccordionTabHeaderMockComponent,
  ],
  providers: [
    { provide: BsAccordionComponent, useClass: BsAccordionMockComponent },
    { provide: BsAccordionTabHeaderComponent, useClass: BsAccordionTabHeaderMockComponent },
  ],
})
export class BsAccordionTestingModule {}
