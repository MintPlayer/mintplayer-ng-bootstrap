import { Component, ContentChildren } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss']
})
export class BsAccordionComponent {

  @ContentChildren(BsAccordionTabComponent) tabPages!: BsAccordionTabComponent[];
  
  //#region ActiveTab
  private _activeTab: BsAccordionTabComponent | null = null;
  public get activeTab() {
    return this._activeTab;
  }
  public set activeTab(value: BsAccordionTabComponent | null) {
    this._activeTab = value;
    this.tabPages.filter((tab) => tab !== value).forEach((tab) => {
      console.log('children', tab.childAccordions);
      tab.childAccordions.forEach((acc) => {
        acc.activeTab = null;
      });
    });
  }
  //#endregion
  
}
