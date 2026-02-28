import { ChangeDetectionStrategy, Component, contentChildren, forwardRef, input, signal, computed } from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAccordionComponent {

  constructor() {
    this.accordionId = signal(++BsAccordionComponent.accordionCounter);
  }

  readonly tabPages = contentChildren<BsAccordionTabComponent>(forwardRef(() => BsAccordionTabComponent));
  disableAnimations = signal(false);
  highlightActiveTab = input(false);

  accordionId = signal<number>(0);
  accordionName = computed(() => `bs-accordion-${this.accordionId()}`);
  accordionTabCounter = 0;
  static accordionCounter = 0;
}
