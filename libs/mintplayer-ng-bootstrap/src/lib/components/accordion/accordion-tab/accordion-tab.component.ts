import { Component, Input, OnInit } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { AccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  styleUrls: ['./accordion-tab.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class AccordionTabComponent implements OnInit {

  accordion: AccordionComponent;
  constructor(accordion: AccordionComponent) {
    this.accordion = accordion;
  }

  ngOnInit() {
  }

  //#region Title
  private _title: string = '';
  public get title() {
    return this._title;
  }
  @Input() public set title(value: string) {
    this._title = value;
  }
  //#endregion

  headerClicked(event: MouseEvent) {
    if (this.accordion.activeTab === this) {
      this.accordion.activeTab = null;
    } else {
      this.accordion.activeTab = this;
    }
  }
}
