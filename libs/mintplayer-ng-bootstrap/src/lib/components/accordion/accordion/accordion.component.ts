import { Component, ContentChildren } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss']
})
export class BsAccordionComponent {

  @ContentChildren(BsAccordionTabComponent) tabPages!: BsAccordionTabComponent[];
  activeTab: BsAccordionTabComponent | null = null;
  
}
