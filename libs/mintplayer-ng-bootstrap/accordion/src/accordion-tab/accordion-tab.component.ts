import { Component, ContentChildren, EventEmitter, forwardRef, HostBinding, Input, Output, QueryList } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { BsAccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  styleUrls: ['./accordion-tab.component.scss'],
  standalone: false,
  animations: [SlideUpDownAnimation]
})
export class BsAccordionTabComponent {

  accordion: BsAccordionComponent;
  accordionTabId$: BehaviorSubject<number>;
  accordionTabName$: Observable<string>;
  @ContentChildren(forwardRef(() => BsAccordionComponent)) childAccordions!: QueryList<BsAccordionComponent>;
  constructor(accordion: BsAccordionComponent) {
    this.accordion = accordion;
    this.accordionTabId$ = new BehaviorSubject<number>(++this.accordion.accordionTabCounter);
    this.accordionTabName$ = combineLatest([this.accordion.accordionName$, this.accordionTabId$])
      .pipe(map(([accordionName, accordionTabId]) => `${accordionName}-${accordionTabId}`));
  }

  @HostBinding('class.accordion-item') accordionItemClass = true;
  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.border-0') noBorder = false;
  
  //#region IsActive
  @Output() public isActiveChange = new EventEmitter<boolean>();
  private _isActive = false;
  public get isActive() {
    return this._isActive;
  }
  @Input() public set isActive(value: boolean) {
    if (this._isActive !== value) {
      this._isActive = value;
      if (this._isActive) {
        this.accordion.tabPages.filter((tab) => {
          return tab !== this;
        }).forEach((tab) => {
          tab.isActive = false;
        });
      } else {
        this.childAccordions.forEach((accordion) => {
          accordion.tabPages.forEach((tab) => {
            tab.isActive = false;
          });
        });
      }
      this.isActiveChange.emit(value);
    }
  }
  //#endregion
}
