import { isPlatformServer, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import '@mintplayer/tab-control-wc';
import type { TabActivateEventDetail } from '@mintplayer/tab-control-wc';
import { BsTabPageComponent } from '../tab-page/tab-page.component';
import { BsTabsPosition } from '../tabs-position';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  imports: [NgTemplateOutlet, BsNoNoscriptDirective],
  providers: [
    { provide: 'TAB_CONTROL', useExisting: BsTabControlComponent }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {
    'class': 'd-block position-relative',
  },
})
export class BsTabControlComponent {
  element = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  readonly isServerSide = isPlatformServer(this.platformId);

  constructor() {
    this.tabControlId = signal(++BsTabControlComponent.tabControlCounter);

    effect(() => {
      const tabPages = this.tabPages();
      const activeTab = this.activeTab();
      const selectFirstTab = this.selectFirstTab();
      if (tabPages.length > 0 && (!activeTab || !tabPages.some(tp => tp === activeTab)) && selectFirstTab) {
        const notDisabled = tabPages.filter((tp) => !tp.disabled());
        if (notDisabled.length > 0) {
          setTimeout(() => this.activeTab.set(notDisabled[0]));
        }
      }
    });
  }

  border = input(true);
  selectFirstTab = input(true);
  tabsPosition = input<BsTabsPosition>('top');

  readonly tabPages = contentChildren(BsTabPageComponent);
  activeTab = signal<BsTabPageComponent | null>(null);
  tabControlId = signal<number>(0);
  tabControlName = computed(() => `bs-tab-control-${this.tabControlId()}`);
  topTabs = computed(() => this.tabsPosition() === 'top');
  bottomTabs = computed(() => this.tabsPosition() === 'bottom');
  checkedTab = computed(() => {
    const active = this.activeTab();
    if (active) return active;
    if (!this.selectFirstTab()) return null;
    return this.tabPages().find(t => !t.disabled()) ?? null;
  });
  // Stable string ID of the active tab, fed to <mp-tab-control [active-tab]>.
  activeTabName = computed(() => this.checkedTab()?.tabName() ?? null);
  static tabControlCounter = 0;
  tabCounter = 0;

  setActiveTab(tab: BsTabPageComponent, event?: Event) {
    event?.preventDefault();
    if (!tab.disabled()) {
      this.activeTab.set(tab);
    }
    return false;
  }

  onTabActivate(event: Event) {
    const ce = event as CustomEvent<TabActivateEventDetail>;
    const tabName = ce.detail.tabId;
    const tab = this.tabPages().find(tp => tp.tabName() === tabName);
    if (tab && !tab.disabled()) {
      this.activeTab.set(tab);
    }
  }
}
