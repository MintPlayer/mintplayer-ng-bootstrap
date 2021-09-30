import { Component, OnInit } from '@angular/core';
import { AccordionTabComponent } from '../accordion-tab/accordion-tab.component';
import { AccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab-header',
  templateUrl: './accordion-tab-header.component.html',
  styleUrls: ['./accordion-tab-header.component.scss']
})
export class AccordionTabHeaderComponent implements OnInit {

  constructor(private accordionTab: AccordionTabComponent, private accordion: AccordionComponent) {
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
