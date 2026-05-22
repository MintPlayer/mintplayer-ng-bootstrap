import { ChangeDetectionStrategy, Component, contentChildren, forwardRef, inject, input, signal, computed } from '@angular/core';
import { BsReducedMotionDirective } from '@mintplayer/ng-bootstrap/reduced-motion';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';
@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsReducedMotionDirective],
})
export class BsAccordionComponent {
  private readonly reducedMotion = inject(BsReducedMotionDirective);

  constructor() {
    this.accordionId = signal(++BsAccordionComponent.accordionCounter);
  }

  readonly tabPages = contentChildren<BsAccordionTabComponent>(forwardRef(() => BsAccordionTabComponent));
  readonly animationsDisabled = computed(() => this.reducedMotion.matches());
  highlightActiveTab = input(false);
  multi = input(false);

  accordionId = signal<number>(0);
  accordionName = computed(() => `bs-accordion-${this.accordionId()}`);
  accordionTabCounter = 0;
  static accordionCounter = 0;
}
