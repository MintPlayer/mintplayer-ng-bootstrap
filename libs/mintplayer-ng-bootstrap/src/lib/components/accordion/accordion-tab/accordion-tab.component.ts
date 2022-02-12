import { Component, ContentChildren, forwardRef, QueryList } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BsAccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  styleUrls: ['./accordion-tab.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class BsAccordionTabComponent {

  accordion: BsAccordionComponent;
  @ContentChildren(forwardRef(() => BsAccordionComponent)) childAccordions!: QueryList<BsAccordionComponent>;
  constructor(accordion: BsAccordionComponent) {
    this.accordion = accordion;
  }
}
