import { Component } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'bs-accordion-tab-header',
  templateUrl: './accordion-tab-header.component.html',
  styleUrls: ['./accordion-tab-header.component.scss'],
  imports: [AsyncPipe],
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
