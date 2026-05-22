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
  BsQuickAccessToolbarComponent,
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
  type RibbonGroupSize,
  type RibbonReduceStep,
} from '@mintplayer/ng-bootstrap/ribbon';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { Color } from '@mintplayer/ng-bootstrap';
import { dedent } from 'ts-dedent';

type RibbonVersion = 'office-2007' | 'office-2010' | 'office-2013' | 'office-2016';
type ColorScheme = 'light' | 'dark' | 'auto';
type TouchMode = 'on' | 'off' | 'auto';
type Direction = 'ltr' | 'rtl';

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
    BsQuickAccessToolbarComponent,
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
    BsCodeSnippetComponent,
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
  readonly touchMode = model<TouchMode>('auto');
  readonly direction = model<Direction>('ltr');

  readonly colorSchemes: ColorScheme[] = ['light', 'dark', 'auto'];
  readonly touchModes: TouchMode[] = ['on', 'off', 'auto'];
  readonly directions: Direction[] = ['ltr', 'rtl'];

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

  /**
   * FR-6 demo — explicit reduceOrder for the Home tab. Walked top-to-bottom
   * on shrink. The Editing group is least essential so it collapses first;
   * Styles drops one size then collapses; the bigger Font / Paragraph groups
   * step down before going to popup; Clipboard (Paste split-button + cut /
   * copy) survives the longest.
   */
  readonly homeReduceOrder: readonly RibbonReduceStep[] = [
    ['editing', 'popup'],
    ['styles', 'medium'],
    ['styles', 'popup'],
    ['paragraph', 'medium'],
    ['font', 'medium'],
    ['paragraph', 'popup'],
    ['font', 'popup'],
  ];

  readonly homeIdealSizes: Record<string, RibbonGroupSize> = {
    clipboard: 'large',
    font: 'large',
    paragraph: 'large',
    styles: 'large',
    editing: 'large',
  };

  readonly snippetMinimal = dedent`
    <bs-ribbon [(minimized)]="minimized">
      <bs-ribbon-tab tabId="home" label="Home">
        <bs-ribbon-group groupId="clipboard" label="Clipboard"
                         dialogLauncher="Clipboard Dialog">
          <bs-ribbon-button itemId="paste" label="Paste" icon="📋"
                            size="large" tooltip="Paste (Ctrl+V)"
                            (itemClick)="onPaste($event)"></bs-ribbon-button>
          <bs-ribbon-button itemId="cut"  label="Cut"  icon="✂️" size="small"
                            (itemClick)="onCut($event)"></bs-ribbon-button>
          <bs-ribbon-button itemId="copy" label="Copy" icon="📄" size="small"
                            (itemClick)="onCopy($event)"></bs-ribbon-button>
        </bs-ribbon-group>
      </bs-ribbon-tab>
    </bs-ribbon>`;

  readonly snippetSplitButton = dedent`
    <bs-ribbon-split-button
      [itemId]="pasteMode().id"
      [label]="pasteMode().label"
      [icon]="pasteMode().icon"
      size="large"
      (mainAction)="onPaste($event)">
      <bs-ribbon-menu-item itemId="paste" label="Paste" icon="📋"
                           (menuSelect)="onPasteModeSelect($event)"></bs-ribbon-menu-item>
      <bs-ribbon-menu-item itemId="paste-values" label="Paste Values" icon="123"
                           (menuSelect)="onPasteModeSelect($event)"></bs-ribbon-menu-item>
      <bs-ribbon-menu-separator></bs-ribbon-menu-separator>
      <bs-ribbon-menu-item itemId="paste-special" label="Paste Special…"
                           (menuSelect)="onPasteSpecial($event)"></bs-ribbon-menu-item>
    </bs-ribbon-split-button>`;

  readonly snippetValueItems = dedent`
    <bs-ribbon-toggle-button itemId="bold" label="Bold" icon="B" size="small"
                             [(ngModel)]="boldOn"></bs-ribbon-toggle-button>

    <bs-ribbon-combo-box itemId="font-family" label="Font Family" size="medium"
                         [options]="fontFamilyOptions"
                         [(ngModel)]="fontFamily"></bs-ribbon-combo-box>

    <bs-ribbon-color-picker itemId="font-color" label="Font Color" size="small"
                            [(ngModel)]="fontColor"></bs-ribbon-color-picker>`;

  readonly snippetContextual = dedent`
    <bs-ribbon-contextual-tab-set
      label="Picture Tools"
      color="#F2C744"
      [hidden]="!pictureSelected()">
      <bs-ribbon-tab tabId="picture-format" label="Format">
        <bs-ribbon-group groupId="picture-styles" label="Picture Styles">
          …
        </bs-ribbon-group>
      </bs-ribbon-tab>
    </bs-ribbon-contextual-tab-set>`;

  readonly snippetQat = dedent`
    <bs-quick-access-toolbar label="Quick Access Toolbar"
                             [touchMode]="touchMode()"
                             [appAccent]="appAccent()">
      <bs-ribbon-button itemId="save" label="Save" icon="💾" size="small"
                        (itemClick)="onSave($event)"></bs-ribbon-button>
      <bs-ribbon-button itemId="undo" label="Undo" icon="↶" size="small"
                        (itemClick)="onUndo($event)"></bs-ribbon-button>
    </bs-quick-access-toolbar>

    <bs-ribbon …> … </bs-ribbon>`;

  readonly snippetTheming = dedent`
    <bs-ribbon
      version="office-2016"
      appAccent="#217346"
      colorScheme="auto"
      touchMode="auto">
      …
    </bs-ribbon>`;

  readonly snippetSlotIcons = dedent`
    <!-- Project any element with slot="icon" — SVGs, <i> from an icon font,
         images, whatever. The host auto-sizes it from the item's size,
         or use one of the .ribbon-icon-large / -medium / -small utility
         classes for an explicit override. -->
    <bs-ribbon-button itemId="save" label="Save" size="large"
                      (itemClick)="onSave($event)">
      <i slot="icon" class="bi bi-save"></i>
    </bs-ribbon-button>

    <bs-ribbon-button itemId="copy" label="Copy" size="small"
                      (itemClick)="onCopy($event)">
      <svg slot="icon" class="ribbon-icon-small" viewBox="0 0 16 16">…</svg>
    </bs-ribbon-button>`;

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
