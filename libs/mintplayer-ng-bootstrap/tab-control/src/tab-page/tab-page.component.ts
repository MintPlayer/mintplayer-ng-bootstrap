import { ChangeDetectionStrategy, Component, contentChild, computed, inject, input, ElementRef, signal } from '@angular/core';
import { BsTabControlComponent } from '../tab-control/tab-control.component';
import { BsTabPageHeaderDirective } from '../tab-page-header/tab-page-header.directive';

@Component({
  selector: 'bs-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Used by <mp-tab-control> to project the active page into its content slot.
    '[attr.slot]': 'contentSlotName()',
    // Tells <mp-tab-control> the tab is disabled without inspecting child types.
    '[attr.data-disabled]': 'disabled() ? "" : null',
    // ARIA wiring (client-side only — the SSR branch renders its own tabpanel
    // div with these attributes inside the bs-tab-page template).
    '[attr.role]': 'tabControl.isServerSide ? null : "tabpanel"',
    '[id]': 'tabControl.isServerSide ? null : tabName() + "-panel"',
    '[attr.aria-labelledby]': 'tabControl.isServerSide ? null : tabName() + "-header-button"',
    '[attr.tabindex]': 'tabControl.isServerSide ? null : (tabControl.activeTab() === this ? 0 : -1)',
  },
})
export class BsTabPageComponent {
  element = inject(ElementRef);
  tabControl = inject(BsTabControlComponent);

  constructor() {
    this.tabId = signal(++this.tabControl.tabCounter);
  }
  tabId = signal<number>(0);
  tabName = computed(() => `${this.tabControl.tabControlName()}-${this.tabId()}`);
  contentSlotName = computed(() =>
    this.tabControl.isServerSide ? null : `${this.tabName()}-content`,
  );

  disabled = input(false);
  readonly headerTemplate = contentChild(BsTabPageHeaderDirective);
}
