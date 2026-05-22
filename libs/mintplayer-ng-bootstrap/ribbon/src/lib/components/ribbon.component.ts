import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { type RibbonTabChangeEvent } from '@mintplayer/web-components/ribbon';

@Component({
  selector: 'bs-ribbon',
  template: `
    <mp-ribbon
      #ribbon
      class="bs-ribbon"
      [attr.active-tab-id]="activeTabId()"
      [attr.layout]="layout()"
      [attr.minimized]="minimized() ? '' : null"
      [attr.version]="version()"
      [attr.color-scheme]="colorScheme()"
      [attr.touch-mode]="touchMode()"
      [attr.key-tips]="keyTips()"
      [style.--bs-ribbon-app-accent]="appAccent()"
      (tab-change)="onTabChange($event)"
      (minimize-toggle)="onMinimizeToggle($event)"
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
  readonly activeTabId = signal<string>('');
  readonly layout = input<'classic' | 'simplified'>('classic');
  readonly minimized = model<boolean>(false);
  readonly version = input<
    'office-2007' | 'office-2010' | 'office-2013' | 'office-2016'
  >('office-2016');
  readonly colorScheme = input<'light' | 'dark' | 'auto'>('auto');
  readonly touchMode = input<'on' | 'off' | 'auto'>('auto');
  readonly appAccent = input<string | null>(null);
  /** Enable / disable Alt-key KeyTips overlay (FR-12). Default `on`. */
  readonly keyTips = input<'on' | 'off'>('on');

  readonly tabChange = output<RibbonTabChangeEvent>();

  readonly ribbonRef = viewChild.required<ElementRef>('ribbon');

  onTabChange(event: Event): void {
    const detail = (event as CustomEvent<RibbonTabChangeEvent>).detail;
    this.activeTabId.set(detail.activeTabId);
    this.tabChange.emit(detail);
  }

  onMinimizeToggle(event: Event): void {
    const detail = (event as CustomEvent<{ minimized: boolean }>).detail;
    this.minimized.set(detail.minimized);
  }
}
