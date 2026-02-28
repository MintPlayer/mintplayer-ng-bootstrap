import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

@Component({
  selector: 'bs-accordion-tab-header',
  templateUrl: './accordion-tab-header.component.html',
  styleUrls: ['./accordion-tab-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAccordionTabHeaderComponent {
  accordionTab = inject(BsAccordionTabComponent);

  headerClicked(event: MouseEvent) {
    event.preventDefault();
    this.accordionTab.setActive(!this.accordionTab.isActive());
  }
}
