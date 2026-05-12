import {
  Component,
  ChangeDetectionStrategy,
  computed,
  model,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BsRibbonComponent,
  BsRibbonGroupComponent,
  BsRibbonButtonComponent,
  BsRibbonSplitButtonComponent,
  BsRibbonDropdownButtonComponent,
  BsRibbonMenuItemComponent,
  BsRibbonMenuSeparatorComponent,
  type RibbonTab,
  type RibbonTabChangeEvent,
} from '@mintplayer/ng-bootstrap/ribbon';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { Color } from '@mintplayer/ng-bootstrap';

type RibbonVersion = 'office-2007' | 'office-2010' | 'office-2013' | 'office-2016';

interface AppAccentOption {
  label: string;
  value: string;
}

@Component({
  selector: 'demo-ribbon',
  templateUrl: './ribbon.component.html',
  styleUrls: ['./ribbon.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    BsRibbonComponent,
    BsRibbonGroupComponent,
    BsRibbonButtonComponent,
    BsRibbonSplitButtonComponent,
    BsRibbonDropdownButtonComponent,
    BsRibbonMenuItemComponent,
    BsRibbonMenuSeparatorComponent,
    BsSelectComponent,
    BsButtonTypeDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RibbonComponent {
  readonly colors = Color;

  readonly minimized = signal(false);
  readonly layout = signal<'classic' | 'simplified'>('classic');
  readonly version = model<RibbonVersion>('office-2016');
  readonly appAccent = model<string>('#2B579A');

  readonly pasteMode = signal<{ id: string; label: string; icon: string }>({
    id: 'paste',
    label: 'Paste',
    icon: '📋',
  });

  readonly minimizeLabel = computed(
    () => `${this.minimized() ? 'Restore' : 'Minimize'} Ribbon (Ctrl+F1)`
  );
  readonly layoutLabel = computed(
    () => `Switch to ${this.layout() === 'classic' ? 'Simplified' : 'Classic'} Layout`
  );

  readonly versions: RibbonVersion[] = [
    'office-2007',
    'office-2010',
    'office-2013',
    'office-2016',
  ];

  readonly appAccents: AppAccentOption[] = [
    { label: 'Word', value: '#2B579A' },
    { label: 'Excel', value: '#217346' },
    { label: 'PowerPoint', value: '#B7472A' },
    { label: 'Outlook', value: '#0078D4' },
    { label: 'OneNote', value: '#7719AA' },
    { label: 'Access', value: '#A4373A' },
  ];

  readonly tabs: RibbonTab[] = [
    { id: 'home', label: 'Home' },
    { id: 'insert', label: 'Insert' },
    { id: 'design', label: 'Design' },
    { id: 'layout', label: 'Layout' },
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

  onPasteModeSelect(event: { itemId: string }): void {
    const modes: Record<string, { id: string; label: string; icon: string }> = {
      paste: { id: 'paste', label: 'Paste', icon: '📋' },
      'paste-values': { id: 'paste-values', label: 'Paste Values', icon: '123' },
      'paste-formatting': {
        id: 'paste-formatting',
        label: 'Paste Format',
        icon: '🎨',
      },
    };
    const next = modes[event.itemId];
    if (next) this.pasteMode.set(next);
  }
}
