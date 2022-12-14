import { Component, ContentChildren, forwardRef, QueryList } from '@angular/core';
import { BsAccordionTabComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsAccordionMockComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  styleUrls: ['./accordion-tab.component.scss'],
  providers: [
    { provide: BsAccordionTabComponent, useExisting: BsAccordionTabMockComponent }
  ],
})
export class BsAccordionTabMockComponent {
  
  accordion: BsAccordionMockComponent;
  constructor(accordion: BsAccordionMockComponent) {
    this.accordion = accordion;
  }
  
  @ContentChildren(() => forwardRef(() => BsAccordionMockComponent)) childAccordions!: QueryList<BsAccordionMockComponent>;
}
