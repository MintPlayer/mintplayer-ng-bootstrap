import { ChangeDetectionStrategy, Component, ContentChildren, forwardRef, input, QueryList, signal, computed } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAccordionComponent {

  constructor() {
    this.accordionId = signal(++BsAccordionComponent.accordionCounter);
  }

  @ContentChildren(forwardRef(() => BsAccordionTabComponent)) tabPages!: QueryList<BsAccordionTabComponent>;
  disableAnimations = false;
  highlightActiveTab = input(false);

  accordionId = signal<number>(0);
  accordionName = computed(() => `bs-accordion-${this.accordionId()}`);
  accordionTabCounter = 0;
  static accordionCounter = 0;
}
