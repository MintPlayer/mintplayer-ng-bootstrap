import { ChangeDetectionStrategy, Component, contentChildren, forwardRef, inject, model, computed, signal } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsAccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  styleUrls: ['./accordion-tab.component.scss'],
  imports: [BsNoNoscriptDirective],
  animations: [SlideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'accordion-item d-block',
  },
})
export class BsAccordionTabComponent {
  accordion = inject(BsAccordionComponent);
  accordionTabId = signal<number>(0);
  accordionTabName = computed(() => `${this.accordion.accordionName()}-${this.accordionTabId()}`);
  readonly childAccordions = contentChildren<BsAccordionComponent>(forwardRef(() => BsAccordionComponent));

  constructor() {
    this.accordionTabId.set(++this.accordion.accordionTabCounter);
  }

  isActive = model<boolean>(false);

  setActive(value: boolean) {
    if (this.isActive() !== value) {
      this.isActive.set(value);
      if (value && !this.accordion.multi()) {
        this.accordion.tabPages().filter((tab) => {
          return tab !== this;
        }).forEach((tab) => {
          tab.isActive.set(false);
        });
      }
      if (!value) {
        this.childAccordions().forEach((accordion) => {
          accordion.tabPages().forEach((tab: BsAccordionTabComponent) => {
            tab.isActive.set(false);
          });
        });
      }
    }
  }
}
