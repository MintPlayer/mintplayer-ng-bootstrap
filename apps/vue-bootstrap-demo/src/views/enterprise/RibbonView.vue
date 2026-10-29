<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  BsQuickAccessToolbar,
  BsRibbon,
  BsRibbonButton,
  BsRibbonCheckBox,
  BsRibbonColorPicker,
  BsRibbonComboBox,
  BsRibbonContextualTabSet,
  BsRibbonDropdownButton,
  BsRibbonGallery,
  BsRibbonGalleryItem,
  BsRibbonGroup,
  BsRibbonGroupButton,
  BsRibbonMenuItem,
  BsRibbonMenuSeparator,
  BsRibbonSplitButton,
  BsRibbonTab,
  BsRibbonToggleButton,
} from '@mintplayer/vue-bootstrap/ribbon';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type {
  RibbonComboBoxOption,
  RibbonGroupButtonOption,
  RibbonGroupSize,
  RibbonItemClickEventDetail,
  RibbonReduceStep,
  RibbonTabChangeEventDetail,
} from '@mintplayer/vue-bootstrap/ribbon';

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
const appAccent = ref<string>('word');
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
  { label: 'Word', value: 'word' },
  { label: 'Excel', value: 'excel' },
  { label: 'PowerPoint', value: 'powerpoint' },
  { label: 'Outlook', value: 'outlook' },
  { label: 'OneNote', value: 'onenote' },
  { label: 'Access', value: 'access' },
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
function onItemClick(detail: unknown) {
  // eslint-disable-next-line no-console
  console.log('Item clicked:', detail);
}

function onTabChange(detail: RibbonTabChangeEventDetail) {
  // eslint-disable-next-line no-console
  console.log('Tab changed:', detail);
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

function onShapeSelect(detail: RibbonItemClickEventDetail) {
  selectedShape.value = detail.itemId;
  // eslint-disable-next-line no-console
  console.log('Shape selected:', detail.itemId);
}

function onPasteModeSelect(detail: { itemId: string }) {
  const modes: Record<string, PasteMode> = {
    paste: { id: 'paste', label: 'Paste', icon: '📋' },
    'paste-values': { id: 'paste-values', label: 'Paste Values', icon: '123' },
    'paste-formatting': { id: 'paste-formatting', label: 'Paste Format', icon: '🎨' },
  };
  const next = modes[detail.itemId];
  if (next) pasteMode.value = next;
}

// ============== Snippets ==============
const snippetMinimal = `<BsRibbon v-model:active-tab-id="activeTab" v-model:minimized="minimized">
  <BsRibbonTab tab-id="home" label="Home">
    <BsRibbonGroup group-id="clipboard" label="Clipboard"
                     dialog-launcher="Clipboard Dialog">
      <BsRibbonButton item-id="paste" label="Paste" icon="📋"
                        size="large" tooltip="Paste (Ctrl+V)"
                        @itemclick="onPaste" />
      <BsRibbonButton item-id="cut"  label="Cut"  icon="✂️" size="small"
                        @itemclick="onCut" />
      <BsRibbonButton item-id="copy" label="Copy" icon="📄" size="small"
                        @itemclick="onCopy" />
    </BsRibbonGroup>
  </BsRibbonTab>
</BsRibbon>`;

const snippetSplitButton = `<BsRibbonSplitButton
  :item-id="pasteMode.id"
  :label="pasteMode.label"
  :icon="pasteMode.icon"
  size="large"
  @mainaction="onPaste">
  <BsRibbonMenuItem item-id="paste" label="Paste" icon="📋"
                       @menuselect="onPasteModeSelect" />
  <BsRibbonMenuItem item-id="paste-values" label="Paste Values" icon="123"
                       @menuselect="onPasteModeSelect" />
  <BsRibbonMenuSeparator />
  <BsRibbonMenuItem item-id="paste-special" label="Paste Special…"
                       @menuselect="onPasteSpecial" />
</BsRibbonSplitButton>`;

const snippetValueItems = `<!-- Vue: bind the prop + listen for the matching event.
     boldOn / fontFamily / fontColor are refs(). -->
<BsRibbonToggleButton item-id="bold" label="Bold" icon="B" size="small"
                         v-model:pressed="boldOn" />

<BsRibbonComboBox item-id="font-family" label="Font Family" size="medium"
                    :options="fontFamilyOptions"
                    v-model:value="fontFamily" />

<BsRibbonColorPicker item-id="font-color" label="Font Color" size="small"
                        v-model:color="fontColor" />`;

const snippetContextual = `<BsRibbonContextualTabSet
  label="Picture Tools"
  color="#F2C744"
  :visible="pictureSelected">
  <BsRibbonTab tab-id="picture-format" label="Format">
    <BsRibbonGroup group-id="picture-styles" label="Picture Styles">
      …
    </BsRibbonGroup>
  </BsRibbonTab>
</BsRibbonContextualTabSet>`;

const snippetQat = `<BsQuickAccessToolbar aria-label="Quick Access Toolbar"
                         :touch-mode="touchMode">
  <BsRibbonButton item-id="save" label="Save" icon="💾" size="small"
                    @itemclick="onSave" />
  <BsRibbonButton item-id="undo" label="Undo" icon="↶" size="small"
                    @itemclick="onUndo" />
</BsQuickAccessToolbar>

<BsRibbon …> … </BsRibbon>`;

const snippetTheming = `<!-- .excel { --bs-ribbon-accent: #217346; } -->
<BsRibbon
  version="office-2016"
  class="excel"
  color-scheme="auto"
  touch-mode="auto">
  …
</BsRibbon>`;

const snippetSlotIcons = `<!-- Any element works as an icon: an SVG, an icon-font <i>, an image.
     It is sized from the size the item renders at. -->
<BsRibbonButton item-id="save" label="Save" size="large"
                @itemclick="onSave">
  <template #iconTemplate><i class="bi bi-save"></i></template>
</BsRibbonButton>

<BsRibbonButton item-id="copy" label="Copy" size="small"
                @itemclick="onCopy">
  <template #iconTemplate><svg viewBox="0 0 16 16">…</svg></template>
</BsRibbonButton>`;
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
            {{ a.label }}
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

    <div class="ribbon-rtl-wrapper" :dir="direction" :data-accent="appAccent">
      <BsQuickAccessToolbar
        aria-label="Quick Access Toolbar"
        :touch-mode="touchMode"
      >
        <BsRibbonButton item-id="qat-save" label="Save" icon="💾" size="small" tooltip="Save (Ctrl+S)" @itemclick="onItemClick" />
        <BsRibbonButton item-id="qat-undo" label="Undo" icon="↶" size="small" tooltip="Undo (Ctrl+Z)" @itemclick="onItemClick" />
        <BsRibbonButton item-id="qat-redo" label="Redo" icon="↷" size="small" tooltip="Redo (Ctrl+Y)" @itemclick="onItemClick" />
      </BsQuickAccessToolbar>

      <BsRibbon
        v-model:active-tab-id="activeTab"
        v-model:minimized="minimized"
        :layout="layout"
        :version="version"
        :color-scheme="colorScheme"
        :touch-mode="touchMode"
        @tabchange="onTabChange"
      >
        <!-- ============ Tell Me slot (FR-24) ============ -->
        <template #tellMe>
          <input
            type="search"
            class="demo-tell-me"
            placeholder="🔍 Tell me what you want to do…"
            aria-label="Tell me what you want to do"
          />
        </template>

        <!-- ============ Home tab ============ -->
        <BsRibbonTab
          tab-id="home"
          label="Home"
          :ideal-sizes="homeIdealSizes"
          :reduce-order="homeReduceOrder"
        >
          <BsRibbonGroup group-id="clipboard" label="Clipboard" dialog-launcher="Clipboard Dialog">
            <BsRibbonSplitButton
              :item-id="pasteMode.id"
              :label="pasteMode.label"
              :icon="pasteMode.icon"
              size="large"
              tooltip="Paste (Ctrl+V)"
              @mainaction="onItemClick"
            >
              <BsRibbonMenuItem
                item-id="paste"
                label="Paste"
                icon="📋"
                @menuselect="(detail: { itemId: string }) => { onPasteModeSelect(detail); onItemClick(detail); }"
              />
              <BsRibbonMenuItem
                item-id="paste-values"
                label="Paste Values"
                icon="123"
                @menuselect="(detail: { itemId: string }) => { onPasteModeSelect(detail); onItemClick(detail); }"
              />
              <BsRibbonMenuItem
                item-id="paste-formatting"
                label="Paste Formatting"
                icon="🎨"
                @menuselect="(detail: { itemId: string }) => { onPasteModeSelect(detail); onItemClick(detail); }"
              />
              <BsRibbonMenuSeparator />
              <BsRibbonMenuItem item-id="paste-special" label="Paste Special…" @menuselect="onItemClick" />
            </BsRibbonSplitButton>
            <BsRibbonButton item-id="cut" label="Cut" icon="✂️" size="small" tooltip="Cut (Ctrl+X)" @itemclick="onItemClick" />
            <BsRibbonButton item-id="copy" label="Copy" icon="📄" size="small" tooltip="Copy (Ctrl+C)" @itemclick="onItemClick" />
            <BsRibbonButton item-id="format-painter" label="Format Painter" icon="🖌️" size="small" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="font" label="Font" dialog-launcher="Font Dialog">
            <BsRibbonComboBox
              item-id="font-family"
              label="Font Family"
              size="medium"
              tooltip="Font Family"
              :options="fontFamilyOptions"
              v-model:value="fontFamily"
            />
            <BsRibbonToggleButton
              item-id="bold"
              label="Bold"
              icon="B"
              size="small"
              tooltip="Bold (Ctrl+B)"
              v-model:pressed="boldOn"
            />
            <BsRibbonToggleButton
              item-id="italic"
              label="Italic"
              icon="I"
              size="small"
              tooltip="Italic (Ctrl+I)"
              v-model:pressed="italicOn"
            />
            <BsRibbonToggleButton
              item-id="underline"
              label="Underline"
              icon="U"
              size="small"
              tooltip="Underline (Ctrl+U)"
              v-model:pressed="underlineOn"
            />
            <BsRibbonButton item-id="strikethrough" label="Strikethrough" icon="S̶" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="subscript" label="Subscript" icon="X₂" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="superscript" label="Superscript" icon="X²" size="small" @itemclick="onItemClick" />
            <BsRibbonColorPicker
              item-id="font-color"
              label="Font Color"
              size="small"
              v-model:color="fontColor"
            />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="paragraph" label="Paragraph" dialog-launcher="Paragraph Dialog">
            <BsRibbonDropdownButton item-id="bullets" label="Bullets" icon="•≡" size="small" tooltip="Bullet list">
              <BsRibbonMenuItem item-id="bullet-disc" label="Disc" icon="●" @menuselect="onItemClick" />
              <BsRibbonMenuItem item-id="bullet-circle" label="Circle" icon="○" @menuselect="onItemClick" />
              <BsRibbonMenuItem item-id="bullet-square" label="Square" icon="■" @menuselect="onItemClick" />
              <BsRibbonMenuSeparator />
              <BsRibbonMenuItem item-id="define-new-bullet" label="Define New Bullet…" @menuselect="onItemClick" />
            </BsRibbonDropdownButton>
            <BsRibbonButton item-id="numbering" label="Numbering" icon="1≡" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="indent-decrease" label="Decrease Indent" icon="⇤" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="indent-increase" label="Increase Indent" icon="⇥" size="small" @itemclick="onItemClick" />
            <BsRibbonGroupButton
              item-id="alignment"
              label="Alignment"
              size="small"
              :buttons="alignmentOptions"
              v-model:selected-value="alignment"
            />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="styles" label="Styles" dialog-launcher="Styles">
            <BsRibbonButton item-id="style-normal" label="Normal" icon="¶" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="style-h1" label="Heading 1" icon="H1" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="style-h2" label="Heading 2" icon="H2" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="style-title" label="Title" icon="T" size="medium" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="editing" label="Editing">
            <BsRibbonButton item-id="find" label="Find" icon="🔍" size="small" tooltip="Find (Ctrl+F)" @itemclick="onItemClick" />
            <BsRibbonButton item-id="replace" label="Replace" icon="🔁" size="small" tooltip="Replace (Ctrl+H)" @itemclick="onItemClick" />
            <BsRibbonButton item-id="select" label="Select" icon="☐" size="small" @itemclick="onItemClick" />
            <BsRibbonCheckBox
              item-id="match-case"
              label="Match case"
              size="small"
              v-model:checked="matchCase"
            />
          </BsRibbonGroup>
        </BsRibbonTab>

        <!-- ============ Insert tab ============ -->
        <BsRibbonTab tab-id="insert" label="Insert">
          <BsRibbonGroup group-id="pages" label="Pages" icon="📑">
            <BsRibbonButton item-id="cover-page" label="Cover Page" icon="📑" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="blank-page" label="Blank Page" icon="📄" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="page-break" label="Page Break" icon="📑" size="medium" tooltip="Insert page break (Ctrl+Enter)" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="tables" label="Tables" icon="▦" :priority="10">
            <BsRibbonButton item-id="table" label="Table" icon="▦" size="large" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="shape-gallery" label="Shape Gallery" icon="⬡">
            <BsRibbonGallery item-id="shapes" label="Shapes" size="medium" :columns="3">
              <BsRibbonGalleryItem item-id="rect" icon="▭" label="Rectangle" :selected="selectedShape === 'rect'" @galleryselect="onShapeSelect" />
              <BsRibbonGalleryItem item-id="circle" icon="●" label="Circle" :selected="selectedShape === 'circle'" @galleryselect="onShapeSelect" />
              <BsRibbonGalleryItem item-id="triangle" icon="▲" label="Triangle" :selected="selectedShape === 'triangle'" @galleryselect="onShapeSelect" />
              <BsRibbonGalleryItem item-id="diamond" icon="◆" label="Diamond" :selected="selectedShape === 'diamond'" @galleryselect="onShapeSelect" />
              <BsRibbonGalleryItem item-id="star" icon="★" label="Star" :selected="selectedShape === 'star'" @galleryselect="onShapeSelect" />
              <BsRibbonGalleryItem item-id="arrow" icon="➤" label="Arrow" :selected="selectedShape === 'arrow'" @galleryselect="onShapeSelect" />
            </BsRibbonGallery>
          </BsRibbonGroup>

          <BsRibbonGroup group-id="illustrations" label="Illustrations" icon="🖼️">
            <BsRibbonButton item-id="pictures" label="Pictures" icon="🖼️" size="large" @itemclick="onItemClick" />
            <BsRibbonButton item-id="shapes" label="Shapes" icon="⬡" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="icons" label="Icons" icon="★" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="chart" label="Chart" icon="📊" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="smartart" label="SmartArt" icon="🧩" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="screenshot" label="Screenshot" icon="📸" size="small" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="links" label="Links" icon="🔗">
            <BsRibbonButton item-id="link" label="Link" icon="🔗" size="medium" tooltip="Insert hyperlink (Ctrl+K)" @itemclick="onItemClick" />
            <BsRibbonButton item-id="bookmark" label="Bookmark" icon="🔖" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="cross-reference" label="Cross-reference" icon="↗" size="medium" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="header-footer" label="Header &amp; Footer" icon="▤">
            <BsRibbonButton item-id="header" label="Header" icon="▔" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="footer" label="Footer" icon="▁" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="page-number" label="Page Number" icon="#" size="medium" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="text" label="Text" icon="🆎">
            <BsRibbonButton item-id="text-box" label="Text Box" icon="🆎" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="wordart" label="WordArt" icon="🅰️" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="date-time" label="Date &amp; Time" icon="📅" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="symbol" label="Symbol" icon="Ω" size="medium" @itemclick="onItemClick" />
          </BsRibbonGroup>
        </BsRibbonTab>

        <!-- ============ Picture Tools (contextual) ============ -->
        <BsRibbonContextualTabSet label="Picture Tools" color="#F2C744" :visible="pictureToolsVisible">
          <BsRibbonTab tab-id="picture-format" label="Format">
            <BsRibbonGroup group-id="picture-styles" label="Picture Styles">
              <BsRibbonButton item-id="picture-border" label="Picture Border" icon="▢" size="medium" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-effects" label="Picture Effects" icon="✨" size="medium" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-layout" label="Picture Layout" icon="🖼️" size="medium" @itemclick="onItemClick" />
            </BsRibbonGroup>
            <BsRibbonGroup group-id="picture-arrange" label="Arrange">
              <BsRibbonButton item-id="picture-position" label="Position" icon="⤧" size="small" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-wrap-text" label="Wrap Text" icon="↩" size="small" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-rotate" label="Rotate" icon="↻" size="small" @itemclick="onItemClick" />
            </BsRibbonGroup>
            <BsRibbonGroup group-id="picture-size" label="Size">
              <BsRibbonButton item-id="picture-crop" label="Crop" icon="✂" size="large" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-width" label="Width" icon="↔" size="small" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-height" label="Height" icon="↕" size="small" @itemclick="onItemClick" />
            </BsRibbonGroup>
          </BsRibbonTab>
          <BsRibbonTab tab-id="picture-effects" label="Effects">
            <BsRibbonGroup group-id="picture-adjust" label="Adjust">
              <BsRibbonButton item-id="picture-brightness" label="Brightness" icon="🔆" size="medium" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-contrast" label="Contrast" icon="◐" size="medium" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-saturation" label="Saturation" icon="🎨" size="medium" @itemclick="onItemClick" />
            </BsRibbonGroup>
            <BsRibbonGroup group-id="picture-artistic" label="Artistic">
              <BsRibbonButton item-id="picture-blur" label="Blur" icon="◌" size="small" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-sharpen" label="Sharpen" icon="◇" size="small" @itemclick="onItemClick" />
              <BsRibbonButton item-id="picture-grayscale" label="Grayscale" icon="◑" size="small" @itemclick="onItemClick" />
            </BsRibbonGroup>
          </BsRibbonTab>
        </BsRibbonContextualTabSet>

        <!-- ============ Design tab ============ -->
        <BsRibbonTab tab-id="design" label="Design">
          <BsRibbonGroup group-id="document-formatting" label="Document Formatting">
            <BsRibbonButton item-id="themes" label="Themes" icon="🎨" size="large" @itemclick="onItemClick" />
            <BsRibbonButton item-id="colors" label="Colors" icon="🌈" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="fonts" label="Fonts" icon="🔤" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="paragraph-spacing" label="Paragraph Spacing" icon="↕" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="effects" label="Effects" icon="✨" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="set-default" label="Set as Default" icon="✓" size="small" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="page-background" label="Page Background">
            <BsRibbonButton item-id="watermark" label="Watermark" icon="💧" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="page-color" label="Page Color" icon="🎨" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="page-borders" label="Page Borders" icon="▢" size="medium" @itemclick="onItemClick" />
          </BsRibbonGroup>
        </BsRibbonTab>

        <!-- ============ Layout tab ============ -->
        <BsRibbonTab tab-id="layout" label="Layout">
          <BsRibbonGroup group-id="page-setup" label="Page Setup" dialog-launcher="Page Setup">
            <BsRibbonButton item-id="margins" label="Margins" icon="▭" size="large" @itemclick="onItemClick" />
            <BsRibbonButton item-id="orientation" label="Orientation" icon="🔄" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="size" label="Size" icon="📏" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="columns" label="Columns" icon="▥" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="breaks" label="Breaks" icon="⤓" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="line-numbers" label="Line Numbers" icon="№" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="hyphenation" label="Hyphenation" icon="‐" size="small" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="paragraph-layout" label="Paragraph" dialog-launcher="Paragraph">
            <BsRibbonButton item-id="indent-left" label="Indent Left" icon="⇥" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="indent-right" label="Indent Right" icon="⇤" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="space-before" label="Space Before" icon="↑≡" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="space-after" label="Space After" icon="↓≡" size="small" @itemclick="onItemClick" />
          </BsRibbonGroup>

          <BsRibbonGroup group-id="arrange" label="Arrange">
            <BsRibbonButton item-id="position" label="Position" icon="⤧" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="wrap-text" label="Wrap Text" icon="↩" size="medium" @itemclick="onItemClick" />
            <BsRibbonButton item-id="bring-forward" label="Bring Forward" icon="⬆" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="send-backward" label="Send Backward" icon="⬇" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="selection-pane" label="Selection Pane" icon="☰" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="align" label="Align" icon="⊟" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="group" label="Group" icon="⊞" size="small" @itemclick="onItemClick" />
            <BsRibbonButton item-id="rotate" label="Rotate" icon="↻" size="small" @itemclick="onItemClick" />
          </BsRibbonGroup>
        </BsRibbonTab>
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
        Copy-paste starting points for the most common ribbon shapes. The
        ribbon and every item are Vue components: <code>v-model:active-tab-id</code>
        and <code>v-model:minimized</code> on <code>&lt;BsRibbon&gt;</code>,
        <code>v-model:pressed</code> / <code>:value</code> / <code>:color</code> /
        <code>:checked</code> / <code>:selected-value</code> on the value items.
      </p>

      <article class="snippet-card">
        <h4>1. Minimal ribbon — one tab, one group, three buttons</h4>
        <BsCodeSnippet :code="snippetMinimal" language="html" />
        <p class="snippet-note">
          <code>v-model:minimized</code> two-way binds the minimize state — Ctrl+F1
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
          Toggling <code>:visible</code> on the set adds or removes its tabs; the ribbon
          announces "Picture Tools, contextual, now available / hidden"
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
          The <code>--bs-ribbon-accent</code> custom property, set on the
          ribbon or any ancestor, drives the brand colour (Word
          <code>#2B579A</code>, Excel <code>#217346</code>, etc.).
          <code>colorScheme="auto"</code> follows
          <code>prefers-color-scheme</code> and ancestor
          <code>data-bs-theme="dark"</code>.
        </p>
      </article>

      <article class="snippet-card">
        <h4>7. Element icons (FR-16)</h4>
        <BsCodeSnippet :code="snippetSlotIcons" language="html" />
        <p class="snippet-note">
          Every item takes an <code>#iconTemplate</code> slot alongside the
          <code>icon</code> string prop. The element is sized from the size the
          item renders at, so it follows the ribbon as groups collapse. The
          <code>icon</code> string remains the fallback — consumers can
          mix-and-match.
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

/* The app accent: the ribbon reads --bs-ribbon-accent from any ancestor. */
.demo-ribbon .ribbon-rtl-wrapper[data-accent='word'] { --bs-ribbon-accent: #2b579a; }
.demo-ribbon .ribbon-rtl-wrapper[data-accent='excel'] { --bs-ribbon-accent: #217346; }
.demo-ribbon .ribbon-rtl-wrapper[data-accent='powerpoint'] { --bs-ribbon-accent: #b7472a; }
.demo-ribbon .ribbon-rtl-wrapper[data-accent='outlook'] { --bs-ribbon-accent: #0078d4; }
.demo-ribbon .ribbon-rtl-wrapper[data-accent='onenote'] { --bs-ribbon-accent: #7719aa; }
.demo-ribbon .ribbon-rtl-wrapper[data-accent='access'] { --bs-ribbon-accent: #a4373a; }

.demo-ribbon .demo-tell-me {
  width: 220px;
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid var(--bs-border-color);
  border-radius: 3px;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
}

.demo-ribbon .demo-tell-me:focus-visible {
  outline: 2px solid var(--bs-primary, #0d6efd);
  outline-offset: -2px;
}

.demo-ribbon .demo-tell-me::placeholder {
  color: var(--bs-secondary-color);
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
