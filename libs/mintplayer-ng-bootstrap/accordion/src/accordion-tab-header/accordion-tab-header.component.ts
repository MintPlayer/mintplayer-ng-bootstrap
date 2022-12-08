import { Component } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion-tab-header',
  templateUrl: './accordion-tab-header.component.html',
  styleUrls: ['./accordion-tab-header.component.scss']
})
export class BsAccordionTabHeaderComponent {

  constructor(accordionTab: BsAccordionTabComponent) {
    this.accordionTab = accordionTab;
  }

  accordionTab: BsAccordionTabComponent;

  headerClicked(event: MouseEvent) {
    event.preventDefault();
    this.accordionTab.isActive = !this.accordionTab.isActive;
  }
}
