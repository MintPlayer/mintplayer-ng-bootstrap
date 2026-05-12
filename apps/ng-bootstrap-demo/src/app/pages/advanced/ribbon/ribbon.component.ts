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
  BsRibbonTabComponent,
  BsRibbonContextualTabSetComponent,
  BsRibbonGroupComponent,
  BsRibbonButtonComponent,
  BsRibbonSplitButtonComponent,
  BsRibbonDropdownButtonComponent,
  BsRibbonMenuItemComponent,
  BsRibbonMenuSeparatorComponent,
  BsRibbonToggleButtonComponent,
  BsRibbonCheckBoxComponent,
  BsRibbonComboBoxComponent,
  BsRibbonColorPickerComponent,
  BsRibbonGroupButtonComponent,
  BsRibbonGalleryComponent,
  BsRibbonGalleryItemComponent,
  type RibbonTabChangeEvent,
  type RibbonComboBoxOption,
  type RibbonGroupButtonOption,
} from '@mintplayer/ng-bootstrap/ribbon';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { Color } from '@mintplayer/ng-bootstrap';

type RibbonVersion = 'office-2007' | 'office-2010' | 'office-2013' | 'office-2016';
type ColorScheme = 'light' | 'dark' | 'auto';

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
    BsRibbonTabComponent,
    BsRibbonContextualTabSetComponent,
    BsRibbonGroupComponent,
    BsRibbonButtonComponent,
    BsRibbonSplitButtonComponent,
    BsRibbonDropdownButtonComponent,
    BsRibbonMenuItemComponent,
    BsRibbonMenuSeparatorComponent,
    BsRibbonToggleButtonComponent,
    BsRibbonCheckBoxComponent,
    BsRibbonComboBoxComponent,
    BsRibbonColorPickerComponent,
    BsRibbonGroupButtonComponent,
    BsRibbonGalleryComponent,
    BsRibbonGalleryItemComponent,
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
  readonly colorScheme = model<ColorScheme>('auto');

  readonly colorSchemes: ColorScheme[] = ['light', 'dark', 'auto'];

  readonly pasteMode = signal<{ id: string; label: string; icon: string }>({
    id: 'paste',
    label: 'Paste',
    icon: '📋',
  });

  readonly boldOn = model<boolean>(false);
  readonly italicOn = model<boolean>(false);
  readonly underlineOn = model<boolean>(false);
  readonly matchCase = model<boolean>(false);

  readonly fontFamily = model<string>('Calibri');
  readonly fontFamilyOptions: RibbonComboBoxOption[] = [
    { label: 'Calibri', value: 'Calibri' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Verdana', value: 'Verdana' },
  ];

  readonly fontColor = model<string>('#000000');

  readonly alignment = model<string>('left');
  readonly alignmentOptions: RibbonGroupButtonOption[] = [
    { value: 'left', label: '⯇≡', icon: '' },
    { value: 'center', label: '≡', icon: '' },
    { value: 'right', label: '≡⯈', icon: '' },
    { value: 'justify', label: '≡≡', icon: '' },
  ];

  readonly selectedShape = signal<string>('');

  readonly pictureToolsVisible = signal<boolean>(false);

  togglePictureTools(): void {
    this.pictureToolsVisible.update((v) => !v);
  }

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

  onShapeSelect(event: { itemId: string }): void {
    this.selectedShape.set(event.itemId);
    console.log('Shape selected:', event.itemId);
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
