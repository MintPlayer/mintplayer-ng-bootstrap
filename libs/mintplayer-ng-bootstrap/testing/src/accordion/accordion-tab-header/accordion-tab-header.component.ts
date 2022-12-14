import { Component } from '@angular/core';
import { BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';

@Component({
  selector: 'bs-accordion-tab-header',
  templateUrl: './accordion-tab-header.component.html',
  styleUrls: ['./accordion-tab-header.component.scss'],
  providers: [
    { provide: BsAccordionTabHeaderComponent, useExisting: BsAccordionTabHeaderMockComponent }
  ],
})
export class BsAccordionTabHeaderMockComponent {}
