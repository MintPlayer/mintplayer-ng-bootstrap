import { Component, ContentChildren, forwardRef, Input, QueryList } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
})
export class BsAccordionComponent {

  constructor() {
    this.accordionId$ = new BehaviorSubject<number>(++BsAccordionComponent.accordionCounter);
    this.accordionName$ = this.accordionId$.pipe(map((id) => `bs-accordion-${id}`));
  }
  
  @ContentChildren(forwardRef(() => BsAccordionTabComponent)) tabPages!: QueryList<BsAccordionTabComponent>;
  disableAnimations = false;
  @Input() highlightActiveTab = false;
  @Input() multiple = false;

  accordionId$: BehaviorSubject<number>;
  accordionName$: Observable<string>;
  accordionTabCounter = 0;
  static accordionCounter = 0;

}
