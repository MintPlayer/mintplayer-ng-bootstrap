import { Component, ContentChildren, forwardRef, Input, QueryList } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss']
})
export class BsAccordionComponent {

  @ContentChildren(forwardRef(() => BsAccordionTabComponent)) tabPages!: QueryList<BsAccordionTabComponent>;
  disableAnimations = false;
  @Input() highlightActiveTab = false;

}
