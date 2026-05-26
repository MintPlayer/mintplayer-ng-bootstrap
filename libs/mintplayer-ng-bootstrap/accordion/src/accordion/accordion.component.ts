import { NgTemplateOutlet, isPlatformServer } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChildren, CUSTOM_ELEMENTS_SCHEMA, forwardRef, inject, input, PLATFORM_ID, signal, computed } from '@angular/core';
import { BsReducedMotionDirective } from '@mintplayer/ng-bootstrap/reduced-motion';
import '@mintplayer/web-components/accordion';
import type { AccordionTabToggleDetail } from '@mintplayer/web-components/accordion';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  hostDirectives: [BsReducedMotionDirective],
  host: {
    // Lift `.accordion` onto the Angular host so Bootstrap's GLOBAL
    // `.accordion { --bs-accordion-*: ... }` declarations attach to
    // <bs-accordion> in light DOM. Provides the default custom-property
    // values that consumers override (e.g. `.multi-level { --bs-accordion-btn-bg: #333 }`).
    'class': 'accordion',
  },
})
export class BsAccordionComponent {
  private readonly reducedMotion = inject(BsReducedMotionDirective);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isServerSide = isPlatformServer(this.platformId);

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

  /**
   * Bridges the WC's `mp-accordion-tab-toggle` event back into the matching
   * tab's `isActive` model. The WC owns the user-interaction → state-change
   * loop; this handler keeps the Angular signal world in sync for consumers
   * using `[(isActive)]` two-way binding.
   */
  onTabToggle(event: Event) {
    const detail = (event as CustomEvent<AccordionTabToggleDetail>).detail;
    const tab = this.tabPages().find((t) => t.tabName() === detail.tabId);
    if (tab && tab.isActive() !== detail.active) {
      tab.isActive.set(detail.active);
      if (!detail.active) {
        // Mirror legacy behavior: closing a tab also closes its descendant
        // accordion tabs.
        tab.childAccordions().forEach((accordion) => {
          accordion.tabPages().forEach((child) => child.isActive.set(false));
        });
      }
    }
  }
}
