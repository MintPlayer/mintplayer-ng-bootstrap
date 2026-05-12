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

export interface RibbonTab {
  id: string;
  label: string;
  content?: string;
}

export interface RibbonTabChangeEvent {
  previousTabId: string;
  activeTabId: string;
}

@Component({
  selector: 'bs-ribbon',
  template: `
    <mp-ribbon
      #ribbon
      class="bs-ribbon"
      [attr.tabs]="tabs() | json"
      [attr.active-tab-id]="activeTabId()"
      [attr.layout]="layout()"
      [attr.minimized]="minimized() ? '' : null"
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

  onTabChange(event: CustomEvent<RibbonTabChangeEvent>): void {
    this.activeTabId.set(event.detail.activeTabId);
    this.tabChange.emit(event.detail);
  }
}
