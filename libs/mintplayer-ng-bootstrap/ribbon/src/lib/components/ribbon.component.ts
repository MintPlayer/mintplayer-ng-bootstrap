import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  computed,
  effect,
  input,
  output,
  viewChild,
  signal,
} from '@angular/core';
import { type RibbonTab, type RibbonTabChangeEvent } from '../types/ribbon.types';

@Component({
  selector: 'bs-ribbon',
  template: `
    <mp-ribbon
      #ribbon
      class="bs-ribbon"
      [attr.tabs]="tabsJson()"
      [attr.active-tab-id]="activeTabId()"
      [attr.layout]="layout()"
      [attr.minimized]="minimized() ? '' : null"
      [attr.version]="version()"
      [style.--bs-ribbon-app-accent]="appAccent()"
      (tab-change)="onTabChange($event)"
    >
      <ng-content></ng-content>
    </mp-ribbon>
  `,
  styles: [`
    :host { display: block; }
    .bs-ribbon { display: block; }
  `],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonComponent {
  readonly tabs = input<RibbonTab[]>([]);
  readonly activeTabId = signal<string>('');
  readonly layout = input<'classic' | 'simplified'>('classic');
  readonly minimized = input<boolean>(false);
  readonly version = input<
    'office-2007' | 'office-2010' | 'office-2013' | 'office-2016'
  >('office-2016');
  readonly appAccent = input<string | null>(null);

  readonly tabsJson = computed(() => JSON.stringify(this.tabs()));

  readonly tabChange = output<RibbonTabChangeEvent>();

  readonly ribbonRef = viewChild.required<ElementRef>('ribbon');

  constructor() {
    // Initialize activeTabId from first tab if not set
    effect(() => {
      const allTabs = this.tabs();
      if (allTabs.length > 0 && !this.activeTabId()) {
        this.activeTabId.set(allTabs[0].id);
      }
    });
  }

  onTabChange(event: Event): void {
    const detail = (event as CustomEvent<RibbonTabChangeEvent>).detail;
    this.activeTabId.set(detail.activeTabId);
    this.tabChange.emit(detail);
  }
}
