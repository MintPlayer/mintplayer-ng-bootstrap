import { ChangeDetectionStrategy, Component, ContentChildren, forwardRef, HostBinding, inject, model, QueryList, computed, signal } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BsAccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'bs-accordion-tab',
  templateUrl: './accordion-tab.component.html',
  styleUrls: ['./accordion-tab.component.scss'],
  standalone: false,
  animations: [SlideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAccordionTabComponent {
  accordion = inject(BsAccordionComponent);
  accordionTabId = signal<number>(0);
  accordionTabName = computed(() => `${this.accordion.accordionName()}-${this.accordionTabId()}`);
  @ContentChildren(forwardRef(() => BsAccordionComponent)) childAccordions!: QueryList<BsAccordionComponent>;

  constructor() {
    this.accordionTabId.set(++this.accordion.accordionTabCounter);
  }

  @HostBinding('class.accordion-item') accordionItemClass = true;
  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.border-0') noBorder = false;

  isActive = model<boolean>(false);

  setActive(value: boolean) {
    if (this.isActive() !== value) {
      this.isActive.set(value);
      if (value && !this.accordion.multi()) {
        this.accordion.tabPages.filter((tab) => {
          return tab !== this;
        }).forEach((tab) => {
          tab.isActive.set(false);
        });
      } else if (!value) {
        this.childAccordions.forEach((accordion) => {
          accordion.tabPages.forEach((tab) => {
            tab.isActive.set(false);
          });
        });
      }
    }
  }
}
