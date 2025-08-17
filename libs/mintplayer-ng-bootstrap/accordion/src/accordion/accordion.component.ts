import { Component, ContentChildren, forwardRef, Input, QueryList } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  standalone: false,
})
export class BsAccordionComponent {

  @ContentChildren(forwardRef(() => BsAccordionTabComponent)) tabPages!: QueryList<BsAccordionTabComponent>;
  disableAnimations = false;
  @Input() highlightActiveTab = false;

  accordionId$ = new BehaviorSubject<number>(++BsAccordionComponent.accordionCounter);
  accordionName$ = this.accordionId$.pipe(map((id) => `bs-accordion-${id}`));
  accordionTabCounter = 0;
  static accordionCounter = 0;

}
