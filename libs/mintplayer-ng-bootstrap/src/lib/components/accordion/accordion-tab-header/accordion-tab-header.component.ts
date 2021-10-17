import { Component, OnInit } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';
import { BsAccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab-header',
  templateUrl: './accordion-tab-header.component.html',
  styleUrls: ['./accordion-tab-header.component.scss']
})
export class BsAccordionTabHeaderComponent implements OnInit {

  constructor(private accordionTab: BsAccordionTabComponent, private accordion: BsAccordionComponent) {
  }

  ngOnInit() {
  }

  headerClicked(event: MouseEvent) {
    if (this.accordion.activeTab === this.accordionTab) {
      this.accordion.activeTab = null;
    } else {
      this.accordion.activeTab = this.accordionTab;
    }
  }
}
