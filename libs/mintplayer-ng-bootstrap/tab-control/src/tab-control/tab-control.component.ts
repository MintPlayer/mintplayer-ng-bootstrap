import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  ElementRef,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import {
  connectTabControl,
  resolveActiveTab,
  TAB_CONTROL_SCOPE,
  tabControlChanged,
  tabControlKeydown,
  tabControlScopedStyles,
  tabControlTabClick,
} from '@mintplayer/ui-core/tab-control';
import { BsTabPageComponent } from '../tab-page/tab-page.component';
import { BsTabsPosition } from '../tabs-position';

/**
 * `<bs-tab-control>` — Bootstrap nav-tabs over one native radio per tab (#437).
 *
 *     <bs-tab-control [border]="true" tabsPosition="top">
 *       <bs-tab-page [disabled]="false">
 *         <ng-container *bsTabPageHeader>Profile</ng-container>
 *         Page content
 *       </bs-tab-page>
 *     </bs-tab-control>
 *
 * Renders the markup of `@mintplayer/ui-core/tab-control` in its own
 * template, so the server-rendered page is a working tab control: the
 * checked radio shows its pane through CSS with JavaScript off. Once the
 * client has rendered, the labels become APG tabs (roving tabindex,
 * automatic activation) and the radios leave the tab order. The host is the
 * `.tab-control` root; each page hands over its header and body as templates.
 */
@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MpPropsDirective, NgTemplateOutlet],
  host: {
    '[attr.data-mps]': 'view().root["data-mps"]',
    '[class.tab-control]': 'true',
    '[attr.data-tabs-position]': 'view().root["data-tabs-position"]',
    '(change)': 'onChange($event)',
  },
})
export class BsTabControlComponent {
  /** Draw the outline around the active pane. */
  readonly border = input(true);
  /** Show the first enabled page while none is active. */
  readonly selectFirstTab = input(true);
  readonly tabsPosition = input<BsTabsPosition>('top');

  readonly tabPages = contentChildren<BsTabPageComponent>(forwardRef(() => BsTabPageComponent));
  /** The page the user picked; `checkedTab` is the one that is shown. */
  readonly activeTab = signal<BsTabPageComponent | null>(null);

  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly id = inject(BsIdService).next('bs-tab-control');
  /** The client has rendered: switch from the radio tier to the tab tier. */
  private readonly enhanced = signal(false);

  private readonly states = computed(() => this.tabPages().map((tab) => ({ disabled: tab.disabled() })));
  protected readonly activeIndex = computed(() => {
    const active = this.activeTab();
    return resolveActiveTab(this.states(), active ? this.tabPages().indexOf(active) : null, this.selectFirstTab());
  });
  readonly checkedTab = computed(() => {
    const index = this.activeIndex();
    return index === null ? null : this.tabPages()[index];
  });
  protected readonly bottomTabs = computed(() => this.tabsPosition() === 'bottom');
  protected readonly view = computed(() =>
    connectTabControl(
      { id: this.id, tabsPosition: this.tabsPosition(), border: this.border(), enhanced: this.enhanced() },
      this.states(),
      this.activeIndex(),
    ),
  );

  constructor() {
    useScopedStyles(TAB_CONTROL_SCOPE, tabControlScopedStyles);
    afterNextRender(() => this.enhanced.set(true));
  }

  setActiveTab(tab: BsTabPageComponent): void {
    if (!tab.disabled()) this.activeTab.set(tab);
  }

  protected onTabClick(event: Event, tab: BsTabPageComponent): void {
    // Before enhancement the label forwards to its radio and `change` selects.
    if (!this.enhanced()) return;
    if (tabControlTabClick(event, tab.disabled())) this.activeTab.set(tab);
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    const target = tabControlKeydown(this.host, event, index, this.states());
    if (target !== null) this.activeTab.set(this.tabPages()[target]);
  }

  protected onChange(event: Event): void {
    const index = tabControlChanged(this.host, event);
    if (index !== null) this.activeTab.set(this.tabPages()[index]);
  }
}
