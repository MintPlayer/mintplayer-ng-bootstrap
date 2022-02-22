import { Component, ContentChildren, EventEmitter, Input, Output } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss']
})
export class BsAccordionComponent {

  @ContentChildren(BsAccordionTabComponent) tabPages!: BsAccordionTabComponent[];
  
  //#region ActiveTab
  @Output() public activeTabChange = new EventEmitter<BsAccordionTabComponent | null>();
  private _activeTab: BsAccordionTabComponent | null = null;
  public get activeTab() {
    return this._activeTab;
  }
  @Input() public set activeTab(value: BsAccordionTabComponent | null) {
    this._activeTab = value;
    this.tabPages.filter((tab) => tab !== value).forEach((tab) => {
      console.log('children', tab.childAccordions);
      tab.childAccordions.forEach((acc) => {
        acc.activeTab = null;
      });
    });
    this.activeTabChange.emit(value);
  }
  //#endregion
  
}
