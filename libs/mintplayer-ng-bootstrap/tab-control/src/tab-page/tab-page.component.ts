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
    // NO client-side ARIA here: <mp-tab-control> already renders the
    // role=tabpanel wrapper (with aria-labelledby) in its shadow root, so a
    // second tabpanel on this host announced every page twice and its id
    // duplicated an IDREF target. The SSR branch renders its own region
    // inside the template instead.
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
