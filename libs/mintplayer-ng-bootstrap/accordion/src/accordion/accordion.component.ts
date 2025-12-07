import { Component, ContentChildren, forwardRef, Input, QueryList, signal, computed } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  standalone: false,
})
export class BsAccordionComponent {

  constructor() {
    this.accordionId = signal(++BsAccordionComponent.accordionCounter);
    this.accordionName = computed(() => `bs-accordion-${this.accordionId()}`);
  }

  @ContentChildren(forwardRef(() => BsAccordionTabComponent)) tabPages!: QueryList<BsAccordionTabComponent>;
  disableAnimations = false;
  @Input() highlightActiveTab = false;

  accordionId;
  accordionName;
  accordionTabCounter = 0;
  static accordionCounter = 0;

}
