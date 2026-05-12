import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsRibbonComponent, RibbonTab, RibbonTabChangeEvent } from '@mintplayer/ng-bootstrap/ribbon';

@Component({
  selector: 'demo-ribbon',
  templateUrl: './ribbon.component.html',
  styleUrls: ['./ribbon.component.scss'],
  imports: [CommonModule, BsRibbonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RibbonComponent {
  readonly minimized = signal(false);
  readonly layout = signal<'classic' | 'simplified'>('classic');

  readonly tabs: RibbonTab[] = [
    {
      id: 'home',
      label: 'Home',
      content: 'Home tab content - Clipboard, Font, Paragraph, Styles, Editing groups',
    },
    {
      id: 'insert',
      label: 'Insert',
      content: 'Insert tab content - Tables, Illustrations, Charts, Text groups',
    },
    {
      id: 'design',
      label: 'Design',
      content: 'Design tab content - Document Formatting, Page Layout',
    },
    {
      id: 'layout',
      label: 'Layout',
      content: 'Layout tab content - Page Setup, Arrange, Size groups',
    },
  ];

  onTabChange(event: RibbonTabChangeEvent): void {
    console.log('Tab changed:', event);
  }

  toggleMinimized(): void {
    this.minimized.update((v) => !v);
  }

  toggleLayout(): void {
    this.layout.update((v) => (v === 'classic' ? 'simplified' : 'classic'));
  }
}
