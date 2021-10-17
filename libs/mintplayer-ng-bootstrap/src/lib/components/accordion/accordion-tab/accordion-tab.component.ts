import { Component, Input, OnInit } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BsAccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  styleUrls: ['./accordion-tab.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class BsAccordionTabComponent implements OnInit {

  accordion: BsAccordionComponent;
  constructor(accordion: BsAccordionComponent) {
    this.accordion = accordion;
  }

  ngOnInit() {
  }

  headerClicked(event: MouseEvent) {
    if (this.accordion.activeTab === this) {
      this.accordion.activeTab = null;
    } else {
      this.accordion.activeTab = this;
    }
  }
}
