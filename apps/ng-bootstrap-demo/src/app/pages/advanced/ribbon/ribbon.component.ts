import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BsRibbonComponent,
  BsRibbonGroupComponent,
  BsRibbonButtonComponent,
  type RibbonTab,
  type RibbonTabChangeEvent,
} from '@mintplayer/ng-bootstrap/ribbon';

@Component({
  selector: 'demo-ribbon',
  templateUrl: './ribbon.component.html',
  styleUrls: ['./ribbon.component.scss'],
  imports: [
    CommonModule,
    BsRibbonComponent,
    BsRibbonGroupComponent,
    BsRibbonButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RibbonComponent {
  readonly minimized = signal(false);
  readonly layout = signal<'classic' | 'simplified'>('classic');

  readonly tabs: RibbonTab[] = [
    {
      id: 'home',
      label: 'Home',
      content: 'Home tab content',
    },
    {
      id: 'insert',
      label: 'Insert',
      content: 'Insert tab content',
    },
    {
      id: 'design',
      label: 'Design',
      content: 'Design tab content',
    },
    {
      id: 'layout',
      label: 'Layout',
      content: 'Layout tab content',
    },
  ];

  onTabChange(event: RibbonTabChangeEvent): void {
    console.log('Tab changed:', event);
  }

  onItemClick(event: any): void {
    console.log('Item clicked:', event);
  }

  toggleMinimized(): void {
    this.minimized.update((v) => !v);
  }

  toggleLayout(): void {
    this.layout.update((v) => (v === 'classic' ? 'simplified' : 'classic'));
  }
}
