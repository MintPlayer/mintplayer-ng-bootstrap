<script setup lang="ts">
import { ref, computed } from 'vue';
import { BsRibbon } from '@mintplayer/vue-bootstrap/ribbon';
// Side-effect import: registers all the ribbon sub-element custom elements
// (mp-ribbon-tab, mp-ribbon-group, mp-ribbon-button, mp-ribbon-split-button,
// mp-ribbon-dropdown-button, mp-ribbon-menu-item, mp-ribbon-menu-separator,
// mp-ribbon-toggle-button, mp-ribbon-check-box, mp-ribbon-combo-box,
// mp-ribbon-color-picker, mp-ribbon-group-button, mp-ribbon-gallery,
// mp-ribbon-gallery-item, mp-quick-access-toolbar, mp-ribbon-contextual-tab-set).
// The Vue compiler treats unknown `mp-*` tags as native HTML thanks to
// `compilerOptions.isCustomElement` in vite.config.mts.
import '@mintplayer/vue-bootstrap/ribbon';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type {
  RibbonComboBoxOption,
  RibbonGroupButtonOption,
  RibbonGroupSize,
  RibbonReduceStep,
} from '@mintplayer/web-components/ribbon';

type RibbonVersion = 'office-2007' | 'office-2010' | 'office-2013' | 'office-2016';
type ColorScheme = 'light' | 'dark' | 'auto';
type TouchMode = 'on' | 'off' | 'auto';
type Direction = 'ltr' | 'rtl';

interface AppAccentOption {
  label: string;
  value: string;
}

interface PasteMode {
  id: string;
  label: string;
  icon: string;
}

// ============== State ==============
const activeTab = ref<string>('home');
const minimized = ref(false);
const layout = ref<'classic' | 'simplified'>('classic');
const version = ref<RibbonVersion>('office-2016');
const appAccent = ref<string>('#2B579A');
const colorScheme = ref<ColorScheme>('auto');
const touchMode = ref<TouchMode>('auto');
const direction = ref<Direction>('ltr');

const pasteMode = ref<PasteMode>({ id: 'paste', label: 'Paste', icon: '📋' });
const boldOn = ref(false);
const italicOn = ref(false);
const underlineOn = ref(false);
const matchCase = ref(false);

const fontFamily = ref<string>('Calibri');
const fontFamilyOptions: RibbonComboBoxOption[] = [
  { label: 'Calibri', value: 'Calibri' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
];

const fontColor = ref<string>('#000000');

const alignment = ref<string>('left');
const alignmentOptions: RibbonGroupButtonOption[] = [
  { value: 'left', label: '⯇≡', icon: '' },
  { value: 'center', label: '≡', icon: '' },
  { value: 'right', label: '≡⯈', icon: '' },
  { value: 'justify', label: '≡≡', icon: '' },
];

const selectedShape = ref<string>('');
const pictureToolsVisible = ref(false);

// ============== Static option lists ==============
const versions: RibbonVersion[] = ['office-2007', 'office-2010', 'office-2013', 'office-2016'];
const colorSchemes: ColorScheme[] = ['light', 'dark', 'auto'];
const touchModes: TouchMode[] = ['on', 'off', 'auto'];
const directions: Direction[] = ['ltr', 'rtl'];

const appAccents: AppAccentOption[] = [
  { label: 'Word', value: '#2B579A' },
  { label: 'Excel', value: '#217346' },
  { label: 'PowerPoint', value: '#B7472A' },
  { label: 'Outlook', value: '#0078D4' },
  { label: 'OneNote', value: '#7719AA' },
  { label: 'Access', value: '#A4373A' },
];

// ============== FR-6: Home reduce / ideal-sizes ==============
const homeReduceOrder: readonly RibbonReduceStep[] = [
  ['editing', 'popup'],
  ['styles', 'medium'],
  ['styles', 'popup'],
  ['paragraph', 'medium'],
  ['font', 'medium'],
  ['paragraph', 'popup'],
  ['font', 'popup'],
];

const homeIdealSizes: Record<string, RibbonGroupSize> = {
  clipboard: 'large',
  font: 'large',
  paragraph: 'large',
  styles: 'large',
  editing: 'large',
};

// ============== Computed labels ==============
const minimizeLabel = computed(
  () => `${minimized.value ? 'Restore' : 'Minimize'} Ribbon (Ctrl+F1)`,
);
const layoutLabel = computed(
  () => `Switch to ${layout.value === 'classic' ? 'Simplified' : 'Classic'} Layout`,
);

// ============== Handlers ==============
function onItemClick(event: Event) {
  // eslint-disable-next-line no-console
  console.log('Item clicked:', event);
}

function onTabChange(event: Event) {
  // eslint-disable-next-line no-console
  console.log('Tab changed:', event);
}

function toggleMinimized() {
  minimized.value = !minimized.value;
}

function toggleLayout() {
  layout.value = layout.value === 'classic' ? 'simplified' : 'classic';
}

function togglePictureTools() {
  pictureToolsVisible.value = !pictureToolsVisible.value;
}

function onShapeSelect(event: Event) {
  const detail = (event as CustomEvent<{ itemId: string }>).detail;
  if (detail) {
    selectedShape.value = detail.itemId;
    // eslint-disable-next-line no-console
    console.log('Shape selected:', detail.itemId);
  }
}

function onPasteModeSelect(event: Event) {
  const detail = (event as CustomEvent<{ itemId: string }>).detail;
  if (!detail) return;
  const modes: Record<string, PasteMode> = {
    paste: { id: 'paste', label: 'Paste', icon: '📋' },
    'paste-values': { id: 'paste-values', label: 'Paste Values', icon: '123' },
    'paste-formatting': { id: 'paste-formatting', label: 'Paste Format', icon: '🎨' },
  };
  const next = modes[detail.itemId];
  if (next) pasteMode.value = next;
}

// ============== Snippets (verbatim from Angular component) ==============
const snippetMinimal = `<bs-ribbon [(minimized)]="minimized">
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

const snippetSplitButton = `<bs-ribbon-split-button
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

const snippetValueItems = `<bs-ribbon-toggle-button itemId="bold" label="Bold" icon="B" size="small"
                         [(ngModel)]="boldOn"></bs-ribbon-toggle-button>

<bs-ribbon-combo-box itemId="font-family" label="Font Family" size="medium"
                     [options]="fontFamilyOptions"
                     [(ngModel)]="fontFamily"></bs-ribbon-combo-box>

<bs-ribbon-color-picker itemId="font-color" label="Font Color" size="small"
                        [(ngModel)]="fontColor"></bs-ribbon-color-picker>`;

const snippetContextual = `<bs-ribbon-contextual-tab-set
  label="Picture Tools"
  color="#F2C744"
  [hidden]="!pictureSelected()">
  <bs-ribbon-tab tabId="picture-format" label="Format">
    <bs-ribbon-group groupId="picture-styles" label="Picture Styles">
      …
    </bs-ribbon-group>
  </bs-ribbon-tab>
</bs-ribbon-contextual-tab-set>`;

const snippetQat = `<bs-quick-access-toolbar label="Quick Access Toolbar"
                         [touchMode]="touchMode()"
                         [appAccent]="appAccent()">
  <bs-ribbon-button itemId="save" label="Save" icon="💾" size="small"
                    (itemClick)="onSave($event)"></bs-ribbon-button>
  <bs-ribbon-button itemId="undo" label="Undo" icon="↶" size="small"
                    (itemClick)="onUndo($event)"></bs-ribbon-button>
</bs-quick-access-toolbar>

<bs-ribbon …> … </bs-ribbon>`;

const snippetTheming = `<bs-ribbon
  version="office-2016"
  appAccent="#217346"
  colorScheme="auto"
  touchMode="auto">
  …
</bs-ribbon>`;

const snippetSlotIcons = `<!-- Project any element with slot="icon" — SVGs, <i> from an icon font,
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
</script>

<template>
  <div class="demo-ribbon">
    <div class="controls">
      <button type="button" class="btn btn-secondary" @click="toggleMinimized">
        {{ minimizeLabel }}
      </button>
      <button type="button" class="btn btn-secondary" @click="toggleLayout">
        {{ layoutLabel }}
      </button>
      <button type="button" class="btn btn-secondary" @click="togglePictureTools">
        {{ pictureToolsVisible ? 'Deselect' : 'Select' }} picture
      </button>
      <label class="control-field">
        Version
        <select v-model="version">
          <option v-for="v in versions" :key="v" :value="v">{{ v }}</option>
        </select>
      </label>
      <label class="control-field">
        App accent
        <select v-model="appAccent">
          <option v-for="a in appAccents" :key="a.value" :value="a.value">
            {{ a.label }} ({{ a.value }})
          </option>
        </select>
      </label>
      <label class="control-field">
        Color scheme
        <select v-model="colorScheme">
          <option v-for="c in colorSchemes" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="control-field">
        Touch mode
        <select v-model="touchMode">
          <option v-for="t in touchModes" :key="t" :value="t">{{ t }}</option>
        </select>
      </label>
      <label class="control-field">
        Direction
        <select v-model="direction">
          <option v-for="d in directions" :key="d" :value="d">{{ d }}</option>
        </select>
      </label>
    </div>

    <div class="ribbon-rtl-wrapper" :dir="direction">
      <mp-quick-access-toolbar
        label="Quick Access Toolbar"
        :touch-mode="touchMode"
        :app-accent="appAccent"
      >
        <mp-ribbon-button item-id="qat-save" label="Save" icon="💾" size="small" tooltip="Save (Ctrl+S)" @item-click="onItemClick" />
        <mp-ribbon-button item-id="qat-undo" label="Undo" icon="↶" size="small" tooltip="Undo (Ctrl+Z)" @item-click="onItemClick" />
        <mp-ribbon-button item-id="qat-redo" label="Redo" icon="↷" size="small" tooltip="Redo (Ctrl+Y)" @item-click="onItemClick" />
      </mp-quick-access-toolbar>

      <BsRibbon
        v-model="activeTab"
        :minimized="minimized"
        :layout="layout"
        :version="version"
        :color-scheme="colorScheme"
        :touch-mode="touchMode"
        :app-accent="appAccent"
        @minimize-toggle="(e: CustomEvent<{ minimized: boolean }>) => (minimized = e.detail.minimized)"
        @tab-change="onTabChange"
      >
        <!-- ============ Tell Me slot (FR-24) ============ -->
        <input
          slot="tell-me"
          type="search"
          class="demo-tell-me"
          placeholder="🔍 Tell me what you want to do…"
          aria-label="Tell me what you want to do"
        />

        <!-- ============ Home tab ============ -->
        <mp-ribbon-tab
          tab-id="home"
          label="Home"
          :ideal-sizes="homeIdealSizes"
          :reduce-order="homeReduceOrder"
        >
          <mp-ribbon-group group-id="clipboard" label="Clipboard" dialog-launcher="Clipboard Dialog">
            <mp-ribbon-split-button
              :item-id="pasteMode.id"
              :label="pasteMode.label"
              :icon="pasteMode.icon"
              size="large"
              tooltip="Paste (Ctrl+V)"
              @main-action="onItemClick"
            >
              <mp-ribbon-menu-item
                item-id="paste"
                label="Paste"
                icon="📋"
                @menu-select="(e: Event) => { onPasteModeSelect(e); onItemClick(e); }"
              />
              <mp-ribbon-menu-item
                item-id="paste-values"
                label="Paste Values"
                icon="123"
                @menu-select="(e: Event) => { onPasteModeSelect(e); onItemClick(e); }"
              />
              <mp-ribbon-menu-item
                item-id="paste-formatting"
                label="Paste Formatting"
                icon="🎨"
                @menu-select="(e: Event) => { onPasteModeSelect(e); onItemClick(e); }"
              />
              <mp-ribbon-menu-separator />
              <mp-ribbon-menu-item item-id="paste-special" label="Paste Special…" @menu-select="onItemClick" />
            </mp-ribbon-split-button>
            <mp-ribbon-button item-id="cut" label="Cut" icon="✂️" size="small" tooltip="Cut (Ctrl+X)" @item-click="onItemClick" />
            <mp-ribbon-button item-id="copy" label="Copy" icon="📄" size="small" tooltip="Copy (Ctrl+C)" @item-click="onItemClick" />
            <mp-ribbon-button item-id="format-painter" label="Format Painter" icon="🖌️" size="small" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="font" label="Font" dialog-launcher="Font Dialog">
            <mp-ribbon-combo-box
              item-id="font-family"
              label="Font Family"
              size="medium"
              tooltip="Font Family"
              :options="fontFamilyOptions"
              :value="fontFamily"
              @value-change="(e: CustomEvent<{ value: unknown }>) => (fontFamily = String(e.detail.value))"
            />
            <mp-ribbon-toggle-button
              item-id="bold"
              label="Bold"
              icon="B"
              size="small"
              tooltip="Bold (Ctrl+B)"
              :pressed="boldOn"
              @toggle="(e: CustomEvent<{ pressed: boolean }>) => (boldOn = e.detail.pressed)"
            />
            <mp-ribbon-toggle-button
              item-id="italic"
              label="Italic"
              icon="I"
              size="small"
              tooltip="Italic (Ctrl+I)"
              :pressed="italicOn"
              @toggle="(e: CustomEvent<{ pressed: boolean }>) => (italicOn = e.detail.pressed)"
            />
            <mp-ribbon-toggle-button
              item-id="underline"
              label="Underline"
              icon="U"
              size="small"
              tooltip="Underline (Ctrl+U)"
              :pressed="underlineOn"
              @toggle="(e: CustomEvent<{ pressed: boolean }>) => (underlineOn = e.detail.pressed)"
            />
            <mp-ribbon-button item-id="strikethrough" label="Strikethrough" icon="S̶" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="subscript" label="Subscript" icon="X₂" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="superscript" label="Superscript" icon="X²" size="small" @item-click="onItemClick" />
            <mp-ribbon-color-picker
              item-id="font-color"
              label="Font Color"
              size="small"
              :color="fontColor"
              @color-change="(e: CustomEvent<{ color: string }>) => (fontColor = e.detail.color)"
            />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="paragraph" label="Paragraph" dialog-launcher="Paragraph Dialog">
            <mp-ribbon-dropdown-button item-id="bullets" label="Bullets" icon="•≡" size="small" tooltip="Bullet list">
              <mp-ribbon-menu-item item-id="bullet-disc" label="Disc" icon="●" @menu-select="onItemClick" />
              <mp-ribbon-menu-item item-id="bullet-circle" label="Circle" icon="○" @menu-select="onItemClick" />
              <mp-ribbon-menu-item item-id="bullet-square" label="Square" icon="■" @menu-select="onItemClick" />
              <mp-ribbon-menu-separator />
              <mp-ribbon-menu-item item-id="define-new-bullet" label="Define New Bullet…" @menu-select="onItemClick" />
            </mp-ribbon-dropdown-button>
            <mp-ribbon-button item-id="numbering" label="Numbering" icon="1≡" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="indent-decrease" label="Decrease Indent" icon="⇤" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="indent-increase" label="Increase Indent" icon="⇥" size="small" @item-click="onItemClick" />
            <mp-ribbon-group-button
              item-id="alignment"
              label="Alignment"
              size="small"
              :buttons="alignmentOptions"
              :value="alignment"
              @group-select="(e: CustomEvent<{ value: unknown }>) => (alignment = String(e.detail.value))"
            />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="styles" label="Styles" dialog-launcher="Styles">
            <mp-ribbon-button item-id="style-normal" label="Normal" icon="¶" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="style-h1" label="Heading 1" icon="H1" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="style-h2" label="Heading 2" icon="H2" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="style-title" label="Title" icon="T" size="medium" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="editing" label="Editing">
            <mp-ribbon-button item-id="find" label="Find" icon="🔍" size="small" tooltip="Find (Ctrl+F)" @item-click="onItemClick" />
            <mp-ribbon-button item-id="replace" label="Replace" icon="🔁" size="small" tooltip="Replace (Ctrl+H)" @item-click="onItemClick" />
            <mp-ribbon-button item-id="select" label="Select" icon="☐" size="small" @item-click="onItemClick" />
            <mp-ribbon-check-box
              item-id="match-case"
              label="Match case"
              size="small"
              :checked="matchCase"
              @check-change="(e: CustomEvent<{ checked: boolean }>) => (matchCase = e.detail.checked)"
            />
          </mp-ribbon-group>
        </mp-ribbon-tab>

        <!-- ============ Insert tab ============ -->
        <mp-ribbon-tab tab-id="insert" label="Insert">
          <mp-ribbon-group group-id="pages" label="Pages" icon="📑">
            <mp-ribbon-button item-id="cover-page" label="Cover Page" icon="📑" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="blank-page" label="Blank Page" icon="📄" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="page-break" label="Page Break" icon="📑" size="medium" tooltip="Insert page break (Ctrl+Enter)" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="tables" label="Tables" icon="▦" :priority="10">
            <mp-ribbon-button item-id="table" label="Table" icon="▦" size="large" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="shape-gallery" label="Shape Gallery" icon="⬡">
            <mp-ribbon-gallery item-id="shapes" label="Shapes" size="medium" :columns="3">
              <mp-ribbon-gallery-item item-id="rect" icon="▭" label="Rectangle" :selected="selectedShape === 'rect'" @gallery-select="onShapeSelect" />
              <mp-ribbon-gallery-item item-id="circle" icon="●" label="Circle" :selected="selectedShape === 'circle'" @gallery-select="onShapeSelect" />
              <mp-ribbon-gallery-item item-id="triangle" icon="▲" label="Triangle" :selected="selectedShape === 'triangle'" @gallery-select="onShapeSelect" />
              <mp-ribbon-gallery-item item-id="diamond" icon="◆" label="Diamond" :selected="selectedShape === 'diamond'" @gallery-select="onShapeSelect" />
              <mp-ribbon-gallery-item item-id="star" icon="★" label="Star" :selected="selectedShape === 'star'" @gallery-select="onShapeSelect" />
              <mp-ribbon-gallery-item item-id="arrow" icon="➤" label="Arrow" :selected="selectedShape === 'arrow'" @gallery-select="onShapeSelect" />
            </mp-ribbon-gallery>
          </mp-ribbon-group>

          <mp-ribbon-group group-id="illustrations" label="Illustrations" icon="🖼️">
            <mp-ribbon-button item-id="pictures" label="Pictures" icon="🖼️" size="large" @item-click="onItemClick" />
            <mp-ribbon-button item-id="shapes" label="Shapes" icon="⬡" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="icons" label="Icons" icon="★" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="chart" label="Chart" icon="📊" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="smartart" label="SmartArt" icon="🧩" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="screenshot" label="Screenshot" icon="📸" size="small" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="links" label="Links" icon="🔗">
            <mp-ribbon-button item-id="link" label="Link" icon="🔗" size="medium" tooltip="Insert hyperlink (Ctrl+K)" @item-click="onItemClick" />
            <mp-ribbon-button item-id="bookmark" label="Bookmark" icon="🔖" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="cross-reference" label="Cross-reference" icon="↗" size="medium" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="header-footer" label="Header &amp; Footer" icon="▤">
            <mp-ribbon-button item-id="header" label="Header" icon="▔" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="footer" label="Footer" icon="▁" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="page-number" label="Page Number" icon="#" size="medium" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="text" label="Text" icon="🆎">
            <mp-ribbon-button item-id="text-box" label="Text Box" icon="🆎" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="wordart" label="WordArt" icon="🅰️" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="date-time" label="Date &amp; Time" icon="📅" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="symbol" label="Symbol" icon="Ω" size="medium" @item-click="onItemClick" />
          </mp-ribbon-group>
        </mp-ribbon-tab>

        <!-- ============ Picture Tools (contextual) ============ -->
        <mp-ribbon-contextual-tab-set label="Picture Tools" color="#F2C744" :hidden="!pictureToolsVisible">
          <mp-ribbon-tab tab-id="picture-format" label="Format">
            <mp-ribbon-group group-id="picture-styles" label="Picture Styles">
              <mp-ribbon-button item-id="picture-border" label="Picture Border" icon="▢" size="medium" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-effects" label="Picture Effects" icon="✨" size="medium" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-layout" label="Picture Layout" icon="🖼️" size="medium" @item-click="onItemClick" />
            </mp-ribbon-group>
            <mp-ribbon-group group-id="picture-arrange" label="Arrange">
              <mp-ribbon-button item-id="picture-position" label="Position" icon="⤧" size="small" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-wrap-text" label="Wrap Text" icon="↩" size="small" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-rotate" label="Rotate" icon="↻" size="small" @item-click="onItemClick" />
            </mp-ribbon-group>
            <mp-ribbon-group group-id="picture-size" label="Size">
              <mp-ribbon-button item-id="picture-crop" label="Crop" icon="✂" size="large" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-width" label="Width" icon="↔" size="small" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-height" label="Height" icon="↕" size="small" @item-click="onItemClick" />
            </mp-ribbon-group>
          </mp-ribbon-tab>
          <mp-ribbon-tab tab-id="picture-effects" label="Effects">
            <mp-ribbon-group group-id="picture-adjust" label="Adjust">
              <mp-ribbon-button item-id="picture-brightness" label="Brightness" icon="🔆" size="medium" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-contrast" label="Contrast" icon="◐" size="medium" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-saturation" label="Saturation" icon="🎨" size="medium" @item-click="onItemClick" />
            </mp-ribbon-group>
            <mp-ribbon-group group-id="picture-artistic" label="Artistic">
              <mp-ribbon-button item-id="picture-blur" label="Blur" icon="◌" size="small" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-sharpen" label="Sharpen" icon="◇" size="small" @item-click="onItemClick" />
              <mp-ribbon-button item-id="picture-grayscale" label="Grayscale" icon="◑" size="small" @item-click="onItemClick" />
            </mp-ribbon-group>
          </mp-ribbon-tab>
        </mp-ribbon-contextual-tab-set>

        <!-- ============ Design tab ============ -->
        <mp-ribbon-tab tab-id="design" label="Design">
          <mp-ribbon-group group-id="document-formatting" label="Document Formatting">
            <mp-ribbon-button item-id="themes" label="Themes" icon="🎨" size="large" @item-click="onItemClick" />
            <mp-ribbon-button item-id="colors" label="Colors" icon="🌈" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="fonts" label="Fonts" icon="🔤" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="paragraph-spacing" label="Paragraph Spacing" icon="↕" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="effects" label="Effects" icon="✨" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="set-default" label="Set as Default" icon="✓" size="small" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="page-background" label="Page Background">
            <mp-ribbon-button item-id="watermark" label="Watermark" icon="💧" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="page-color" label="Page Color" icon="🎨" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="page-borders" label="Page Borders" icon="▢" size="medium" @item-click="onItemClick" />
          </mp-ribbon-group>
        </mp-ribbon-tab>

        <!-- ============ Layout tab ============ -->
        <mp-ribbon-tab tab-id="layout" label="Layout">
          <mp-ribbon-group group-id="page-setup" label="Page Setup" dialog-launcher="Page Setup">
            <mp-ribbon-button item-id="margins" label="Margins" icon="▭" size="large" @item-click="onItemClick" />
            <mp-ribbon-button item-id="orientation" label="Orientation" icon="🔄" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="size" label="Size" icon="📏" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="columns" label="Columns" icon="▥" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="breaks" label="Breaks" icon="⤓" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="line-numbers" label="Line Numbers" icon="№" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="hyphenation" label="Hyphenation" icon="‐" size="small" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="paragraph-layout" label="Paragraph" dialog-launcher="Paragraph">
            <mp-ribbon-button item-id="indent-left" label="Indent Left" icon="⇥" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="indent-right" label="Indent Right" icon="⇤" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="space-before" label="Space Before" icon="↑≡" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="space-after" label="Space After" icon="↓≡" size="small" @item-click="onItemClick" />
          </mp-ribbon-group>

          <mp-ribbon-group group-id="arrange" label="Arrange">
            <mp-ribbon-button item-id="position" label="Position" icon="⤧" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="wrap-text" label="Wrap Text" icon="↩" size="medium" @item-click="onItemClick" />
            <mp-ribbon-button item-id="bring-forward" label="Bring Forward" icon="⬆" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="send-backward" label="Send Backward" icon="⬇" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="selection-pane" label="Selection Pane" icon="☰" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="align" label="Align" icon="⊟" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="group" label="Group" icon="⊞" size="small" @item-click="onItemClick" />
            <mp-ribbon-button item-id="rotate" label="Rotate" icon="↻" size="small" @item-click="onItemClick" />
          </mp-ribbon-group>
        </mp-ribbon-tab>
      </BsRibbon>
    </div>

    <section class="keymap" aria-labelledby="ribbon-keymap-heading">
      <h3 id="ribbon-keymap-heading">Keyboard shortcuts</h3>
      <p class="keymap-intro">
        The ribbon follows the WAI-ARIA tab + toolbar pattern with Office-style
        shortcuts. Click anywhere in the ribbon first to put focus inside it.
      </p>

      <div class="keymap-grid">
        <article class="keymap-card">
          <h4>Tab strip</h4>
          <dl>
            <dt><kbd>←</kbd> / <kbd>→</kbd></dt>
            <dd>Move focus to the previous / next tab</dd>
            <dt><kbd>Home</kbd> / <kbd>End</kbd></dt>
            <dd>Jump to the first / last tab</dd>
            <dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt>
            <dd>Activate the focused tab</dd>
            <dt><kbd>Double-click</kbd></dt>
            <dd>Minimize / restore the ribbon</dd>
          </dl>
        </article>

        <article class="keymap-card">
          <h4>Inside a group</h4>
          <dl>
            <dt><kbd>←</kbd> / <kbd>→</kbd></dt>
            <dd>Rove between items in the same group (wraps at ends)</dd>
            <dt><kbd>Home</kbd> / <kbd>End</kbd></dt>
            <dd>Jump to the first / last item in the group</dd>
            <dt><kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd></dt>
            <dd>Move to the next / previous group (one tabbable per group)</dd>
            <dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt>
            <dd>Activate the focused item</dd>
          </dl>
        </article>

        <article class="keymap-card">
          <h4>Across groups</h4>
          <dl>
            <dt><kbd>Ctrl</kbd>+<kbd>←</kbd> / <kbd>Ctrl</kbd>+<kbd>→</kbd></dt>
            <dd>Jump focus to the previous / next group inside the active tab</dd>
          </dl>
        </article>

        <article class="keymap-card">
          <h4>Dropdowns, menus &amp; collapsed groups</h4>
          <dl>
            <dt><kbd>↓</kbd> / <kbd>Alt</kbd>+<kbd>↓</kbd></dt>
            <dd>Open the menu on a dropdown / split button, or on a collapsed group's chevron</dd>
            <dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt>
            <dd>Same as above (activate the trigger). Opens the popup and moves focus into its first item</dd>
            <dt><kbd>↑</kbd> / <kbd>↓</kbd></dt>
            <dd>Move highlight between menu items</dd>
            <dt><kbd>←</kbd> / <kbd>→</kbd></dt>
            <dd>Inside a collapsed group's popup, rove between items the same as inside an expanded group</dd>
            <dt><kbd>Esc</kbd></dt>
            <dd>Close the open menu or popup and return focus to the trigger</dd>
          </dl>
        </article>

        <article class="keymap-card">
          <h4>Ribbon itself</h4>
          <dl>
            <dt><kbd>Ctrl</kbd>+<kbd>F1</kbd></dt>
            <dd>Minimize / restore the ribbon (announced via live region)</dd>
          </dl>
        </article>

        <article class="keymap-card">
          <h4>KeyTips (Office shortcut overlay)</h4>
          <dl>
            <dt><kbd>Alt</kbd></dt>
            <dd>Show or hide the KeyTips overlay. Auto-derived from labels; explicit override via <code>data-key-tip="X"</code></dd>
            <dt><kbd>A</kbd>–<kbd>Z</kbd></dt>
            <dd>While the overlay is up, press a tip letter to activate that tab. Once a tab opens, press another letter to fire an item</dd>
            <dt><kbd>Esc</kbd></dt>
            <dd>Drop back one level: items → tabs → overlay closed</dd>
          </dl>
        </article>

        <article class="keymap-card">
          <h4>Quick Access Toolbar</h4>
          <dl>
            <dt><kbd>←</kbd> / <kbd>→</kbd></dt>
            <dd>Rove between pinned commands</dd>
            <dt><kbd>Home</kbd> / <kbd>End</kbd></dt>
            <dd>First / last pinned command</dd>
          </dl>
        </article>
      </div>

      <p class="keymap-note">
        Screen-reader users also hear announcements (<code>aria-live="polite"</code>)
        for ribbon minimize / restore, contextual-tab show / hide, and overflow-group
        collapse / expand transitions.
      </p>
    </section>

    <section class="snippets" aria-labelledby="ribbon-snippets-heading">
      <h3 id="ribbon-snippets-heading">Code samples</h3>
      <p class="snippets-intro">
        Copy-paste starting points for the most common ribbon shapes. Every
        element has an Angular wrapper (<code>bs-*</code>) over a Lit web
        component (<code>mp-*</code>); these snippets show the Angular form.
      </p>

      <article class="snippet-card">
        <h4>1. Minimal ribbon — one tab, one group, three buttons</h4>
        <BsCodeSnippet :code="snippetMinimal" language="html" />
        <p class="snippet-note">
          <code>[(minimized)]</code> two-way binds the minimize state — Ctrl+F1
          and double-clicking a tab will update your signal.
        </p>
      </article>

      <article class="snippet-card">
        <h4>2. Split-button with a "last-used" menu</h4>
        <BsCodeSnippet :code="snippetSplitButton" language="html" />
        <p class="snippet-note">
          The split-button never mutates its own label / icon. Implement the
          "last-used" pattern in your component by updating
          <code>pasteMode</code> inside <code>onPasteModeSelect</code>.
        </p>
      </article>

      <article class="snippet-card">
        <h4>3. Value-bearing items with <code>[(ngModel)]</code></h4>
        <BsCodeSnippet :code="snippetValueItems" language="html" />
        <p class="snippet-note">
          Every value-bearing wrapper (toggle-button, check-box, combo-box,
          color-picker, group-button) implements <code>ControlValueAccessor</code>
          so it works with both template-driven (<code>ngModel</code>) and
          reactive forms (<code>formControl</code>).
        </p>
      </article>

      <article class="snippet-card">
        <h4>4. Contextual tab set</h4>
        <BsCodeSnippet :code="snippetContextual" language="html" />
        <p class="snippet-note">
          Toggling <code>[hidden]</code> on the set fires
          <code>contextual-visibility-change</code>; the ribbon re-processes its
          slot and announces "Picture Tools, contextual, now available / hidden"
          via the live region.
        </p>
      </article>

      <article class="snippet-card">
        <h4>5. Quick Access Toolbar (sibling, not nested)</h4>
        <BsCodeSnippet :code="snippetQat" language="html" />
        <p class="snippet-note">
          The QAT is deliberately rendered as a sibling — two top-level
          <code>role="toolbar"</code> regions keep the a11y tree flat.
          Persistence of pinned commands is up to your app.
        </p>
      </article>

      <article class="snippet-card">
        <h4>6. Per-app appearance + dark mode</h4>
        <BsCodeSnippet :code="snippetTheming" language="html" />
        <p class="snippet-note">
          <code>version</code> picks one of <code>office-2007</code> /
          <code>2010</code> / <code>2013</code> / <code>2016</code>.
          <code>appAccent</code> drives the brand colour (Word
          <code>#2B579A</code>, Excel <code>#217346</code>, etc.).
          <code>colorScheme="auto"</code> follows
          <code>prefers-color-scheme</code> and ancestor
          <code>data-bs-theme="dark"</code>.
        </p>
      </article>

      <article class="snippet-card">
        <h4>7. Slot-based icons (FR-16)</h4>
        <BsCodeSnippet :code="snippetSlotIcons" language="html" />
        <p class="snippet-note">
          Every item exposes a <code>&lt;slot name="icon"&gt;</code> alongside
          the existing <code>icon</code> string attribute. The host's
          <code>size</code> attribute auto-sizes slotted icons via
          <code>::slotted</code> rules; consumers wanting an explicit override
          apply <code>.ribbon-icon-large</code> / <code>-medium</code> /
          <code>-small</code> directly on the projected element. The
          <code>icon=""</code> attribute remains supported as the fallback —
          consumers can mix-and-match.
        </p>
      </article>
    </section>
  </div>
</template>

<!-- The global `.demo-page` caps content at 1200px for readability, but the
     ribbon expects to fill the full viewport width (it adapts via its own
     reduceOrder/idealSizes layout algorithm). The override targets an
     ancestor of this SFC's root, which scoped styles can't reach — so it
     lives in an unscoped block. The :has() filter limits the override to
     pages that actually contain a ribbon (i.e. this one). -->
<style>
.demo-page:has(.demo-ribbon) {
  max-width: none;
}
</style>

<style scoped>
.demo-ribbon .ribbon-rtl-wrapper {
  display: block;
}

.demo-ribbon .demo-tell-me {
  width: 220px;
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.92);
  color: inherit;
}

.demo-ribbon .demo-tell-me:focus-visible {
  outline: 2px solid var(--bs-primary, #0d6efd);
  outline-offset: -2px;
}

.demo-ribbon .demo-tell-me::placeholder {
  color: rgba(0, 0, 0, 0.45);
}

.demo-ribbon .controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}

.demo-ribbon .control-field {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
}

.demo-ribbon .keymap {
  margin-top: 2rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.5rem;
  background: var(--bs-tertiary-bg, #f8f9fa);
  color: var(--bs-body-color, inherit);
}

.demo-ribbon .keymap h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}

.demo-ribbon .keymap-intro {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--bs-secondary-color, #6c757d);
}

.demo-ribbon .keymap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.demo-ribbon .keymap-card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.375rem;
  background: var(--bs-body-bg, #fff);
}

.demo-ribbon .keymap-card h4 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: var(--bs-secondary-color, #495057);
  border-bottom: 1px solid var(--bs-border-color, #e9ecef);
  padding-bottom: 0.35rem;
}

.demo-ribbon .keymap-card dl {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(110px, max-content) 1fr;
  column-gap: 0.75rem;
  row-gap: 0.4rem;
  font-size: 0.8125rem;
}

.demo-ribbon .keymap-card dt {
  font-weight: 500;
  white-space: nowrap;
}

.demo-ribbon .keymap-card dd {
  margin: 0;
  color: var(--bs-secondary-color, #6c757d);
}

.demo-ribbon .keymap kbd {
  display: inline-block;
  padding: 0.05rem 0.4rem;
  font-family: ui-monospace, 'SF Mono', Consolas, Menlo, monospace;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--bs-body-color, #212529);
  background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #ced4da);
  border-bottom-width: 2px;
  border-radius: 0.25rem;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
}

.demo-ribbon .keymap-note {
  margin: 1rem 0 0;
  font-size: 0.8125rem;
  color: var(--bs-secondary-color, #6c757d);
}

.demo-ribbon .keymap-note code {
  font-family: ui-monospace, 'SF Mono', Consolas, Menlo, monospace;
  font-size: 0.78rem;
  background: var(--bs-secondary-bg, #e9ecef);
  padding: 0.05rem 0.3rem;
  border-radius: 0.2rem;
}

.demo-ribbon .snippets {
  margin-top: 2rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.5rem;
  background: var(--bs-tertiary-bg, #f8f9fa);
  color: var(--bs-body-color, inherit);
}

.demo-ribbon .snippets h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}

.demo-ribbon .snippets-intro {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--bs-secondary-color, #6c757d);
}

.demo-ribbon .snippets-intro code {
  font-family: ui-monospace, 'SF Mono', Consolas, Menlo, monospace;
  font-size: 0.8rem;
  background: var(--bs-secondary-bg, #e9ecef);
  padding: 0.05rem 0.3rem;
  border-radius: 0.2rem;
}

.demo-ribbon .snippet-card {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.375rem;
  background: var(--bs-body-bg, #fff);
}

.demo-ribbon .snippet-card:last-child {
  margin-bottom: 0;
}

.demo-ribbon .snippet-card h4 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: var(--bs-secondary-color, #495057);
}

.demo-ribbon .snippet-card h4 code {
  font-family: ui-monospace, 'SF Mono', Consolas, Menlo, monospace;
  font-size: 0.85rem;
  background: var(--bs-secondary-bg, #e9ecef);
  padding: 0.05rem 0.3rem;
  border-radius: 0.2rem;
}

.demo-ribbon .snippet-card :deep(bs-code-snippet),
.demo-ribbon .snippet-card :deep(mp-code-snippet) {
  display: block;
  margin: 0;
}

.demo-ribbon .snippet-note {
  margin: 0.6rem 0 0;
  font-size: 0.8125rem;
  color: var(--bs-secondary-color, #6c757d);
}

.demo-ribbon .snippet-note code {
  font-family: ui-monospace, 'SF Mono', Consolas, Menlo, monospace;
  font-size: 0.78rem;
  background: var(--bs-secondary-bg, #e9ecef);
  padding: 0.05rem 0.3rem;
  border-radius: 0.2rem;
}
</style>
