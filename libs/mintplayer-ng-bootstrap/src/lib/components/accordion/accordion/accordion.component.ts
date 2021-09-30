import { Component, ContentChildren, OnInit } from '@angular/core';
import { AccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss']
})
export class AccordionComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

  @ContentChildren(AccordionTabComponent) tabPages!: AccordionTabComponent[];
  activeTab: AccordionTabComponent | null = null;
}
