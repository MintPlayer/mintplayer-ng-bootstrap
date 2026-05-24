import { useMemo, useState } from 'react';
import {
  BsRibbon,
  BsQuickAccessToolbar,
  BsRibbonTab,
  BsRibbonContextualTabSet,
  BsRibbonGroup,
  BsRibbonButton,
  BsRibbonSplitButton,
  BsRibbonDropdownButton,
  BsRibbonMenuItem,
  BsRibbonMenuSeparator,
  BsRibbonToggleButton,
  BsRibbonCheckBox,
  BsRibbonComboBox,
  BsRibbonColorPicker,
  BsRibbonGroupButton,
  BsRibbonGallery,
  BsRibbonGalleryItem,
} from '@mintplayer/react-bootstrap/ribbon';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type {
  RibbonComboBoxOption,
  RibbonGroupButtonOption,
  RibbonGroupSize,
  RibbonReduceStep,
} from '@mintplayer/web-components/ribbon';
import './RibbonPage.css';

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

const VERSIONS: RibbonVersion[] = ['office-2007', 'office-2010', 'office-2013', 'office-2016'];
const COLOR_SCHEMES: ColorScheme[] = ['light', 'dark', 'auto'];
const TOUCH_MODES: TouchMode[] = ['on', 'off', 'auto'];
const DIRECTIONS: Direction[] = ['ltr', 'rtl'];

const APP_ACCENTS: AppAccentOption[] = [
  { label: 'Word', value: '#2B579A' },
  { label: 'Excel', value: '#217346' },
  { label: 'PowerPoint', value: '#B7472A' },
  { label: 'Outlook', value: '#0078D4' },
  { label: 'OneNote', value: '#7719AA' },
  { label: 'Access', value: '#A4373A' },
];

const FONT_FAMILY_OPTIONS: RibbonComboBoxOption[] = [
  { label: 'Calibri', value: 'Calibri' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
];

const ALIGNMENT_OPTIONS: RibbonGroupButtonOption[] = [
  { value: 'left', label: '⯇≡', icon: '' },
  { value: 'center', label: '≡', icon: '' },
  { value: 'right', label: '≡⯈', icon: '' },
  { value: 'justify', label: '≡≡', icon: '' },
];

const PASTE_MODES: Record<string, PasteMode> = {
  paste: { id: 'paste', label: 'Paste', icon: '📋' },
  'paste-values': { id: 'paste-values', label: 'Paste Values', icon: '123' },
  'paste-formatting': { id: 'paste-formatting', label: 'Paste Format', icon: '🎨' },
};

/**
 * FR-6 demo — explicit reduceOrder for the Home tab. Walked top-to-bottom
 * on shrink. The Editing group is least essential so it collapses first;
 * Styles drops one size then collapses; the bigger Font / Paragraph groups
 * step down before going to popup; Clipboard (Paste split-button + cut /
 * copy) survives the longest.
 */
const HOME_REDUCE_ORDER: readonly RibbonReduceStep[] = [
  ['editing', 'popup'],
  ['styles', 'medium'],
  ['styles', 'popup'],
  ['paragraph', 'medium'],
  ['font', 'medium'],
  ['paragraph', 'popup'],
  ['font', 'popup'],
];

const HOME_IDEAL_SIZES: Record<string, RibbonGroupSize> = {
  clipboard: 'large',
  font: 'large',
  paragraph: 'large',
  styles: 'large',
  editing: 'large',
};

const SNIPPET_MINIMAL = `<BsRibbon minimized={minimized} onMinimizeToggle={(e) => setMinimized(e.detail.minimized)}>
  <BsRibbonTab tabId="home" label="Home">
    <BsRibbonGroup groupId="clipboard" label="Clipboard"
                   dialogLauncher="Clipboard Dialog">
      <BsRibbonButton itemId="paste" label="Paste" icon="📋"
                      size="large" tooltip="Paste (Ctrl+V)"
                      onItemClick={onPaste} />
      <BsRibbonButton itemId="cut"  label="Cut"  icon="✂️" size="small"
                      onItemClick={onCut} />
      <BsRibbonButton itemId="copy" label="Copy" icon="📄" size="small"
                      onItemClick={onCopy} />
    </BsRibbonGroup>
  </BsRibbonTab>
</BsRibbon>`;

const SNIPPET_SPLIT_BUTTON = `<BsRibbonSplitButton
  itemId={pasteMode.id}
  label={pasteMode.label}
  icon={pasteMode.icon}
  size="large"
  onMainAction={onPaste}>
  <BsRibbonMenuItem itemId="paste" label="Paste" icon="📋"
                    onMenuSelect={onPasteModeSelect} />
  <BsRibbonMenuItem itemId="paste-values" label="Paste Values" icon="123"
                    onMenuSelect={onPasteModeSelect} />
  <BsRibbonMenuSeparator />
  <BsRibbonMenuItem itemId="paste-special" label="Paste Special…"
                    onMenuSelect={onPasteSpecial} />
</BsRibbonSplitButton>`;

const SNIPPET_VALUE_ITEMS = `<BsRibbonToggleButton itemId="bold" label="Bold" icon="B" size="small"
                      pressed={boldOn}
                      onToggle={(e) => setBoldOn(e.detail.pressed)} />

<BsRibbonComboBox itemId="font-family" label="Font Family" size="medium"
                  options={fontFamilyOptions}
                  value={fontFamily}
                  onValueChange={(e) => setFontFamily(String(e.detail.value))} />

<BsRibbonColorPicker itemId="font-color" label="Font Color" size="small"
                     value={fontColor}
                     onColorChange={(e) => setFontColor(e.detail.color)} />`;

const SNIPPET_CONTEXTUAL = `<BsRibbonContextualTabSet
  label="Picture Tools"
  color="#F2C744"
  hidden={!pictureSelected}>
  <BsRibbonTab tabId="picture-format" label="Format">
    <BsRibbonGroup groupId="picture-styles" label="Picture Styles">
      …
    </BsRibbonGroup>
  </BsRibbonTab>
</BsRibbonContextualTabSet>`;

const SNIPPET_QAT = `<BsQuickAccessToolbar label="Quick Access Toolbar"
                       touchMode={touchMode}
                       appAccent={appAccent}>
  <BsRibbonButton itemId="save" label="Save" icon="💾" size="small"
                  onItemClick={onSave} />
  <BsRibbonButton itemId="undo" label="Undo" icon="↶" size="small"
                  onItemClick={onUndo} />
</BsQuickAccessToolbar>

<BsRibbon …> … </BsRibbon>`;

const SNIPPET_THEMING = `<BsRibbon
  version="office-2016"
  appAccent="#217346"
  colorScheme="auto"
  touchMode="auto">
  …
</BsRibbon>`;

const SNIPPET_SLOT_ICONS = `{/* Project any element with slot="icon" — SVGs, <i> from an icon font,
     images, whatever. The host auto-sizes it from the item's size,
     or use one of the .ribbon-icon-large / -medium / -small utility
     classes for an explicit override. */}
<BsRibbonButton itemId="save" label="Save" size="large"
                onItemClick={onSave}>
  <i slot="icon" className="bi bi-save" />
</BsRibbonButton>

<BsRibbonButton itemId="copy" label="Copy" size="small"
                onItemClick={onCopy}>
  <svg slot="icon" className="ribbon-icon-small" viewBox="0 0 16 16">…</svg>
</BsRibbonButton>`;

// createComponent's generated prop type only covers public class fields,
// so any string/object prop we want to pass through to the underlying mp-*
// element has to be applied via the spread escape hatch:
//   prop={value}

function onItemClick(event: CustomEvent<{ itemId?: string }>): void {
  console.log('Item clicked:', event);
}

export function RibbonPage() {
  const [minimized, setMinimized] = useState(false);
  const [layout, setLayout] = useState<'classic' | 'simplified'>('classic');
  const [version, setVersion] = useState<RibbonVersion>('office-2016');
  const [appAccent, setAppAccent] = useState<string>('#2B579A');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('auto');
  const [touchMode, setTouchMode] = useState<TouchMode>('auto');
  const [direction, setDirection] = useState<Direction>('ltr');

  const [pasteMode, setPasteMode] = useState<PasteMode>(PASTE_MODES.paste);

  const [boldOn, setBoldOn] = useState(false);
  const [italicOn, setItalicOn] = useState(false);
  const [underlineOn, setUnderlineOn] = useState(false);
  const [matchCase, setMatchCase] = useState(false);

  const [fontFamily, setFontFamily] = useState<string>('Calibri');
  const [fontColor, setFontColor] = useState<string>('#000000');

  const [alignment, setAlignment] = useState<string>('left');

  const [selectedShape, setSelectedShape] = useState<string>('');

  const [pictureToolsVisible, setPictureToolsVisible] = useState(false);

  const minimizeLabel = useMemo(
    () => `${minimized ? 'Restore' : 'Minimize'} Ribbon (Ctrl+F1)`,
    [minimized],
  );
  const layoutLabel = useMemo(
    () => `Switch to ${layout === 'classic' ? 'Simplified' : 'Classic'} Layout`,
    [layout],
  );

  const handlePasteModeSelect = (event: CustomEvent<{ itemId?: string }>) => {
    const id = event.detail?.itemId ?? '';
    const next = PASTE_MODES[id];
    if (next) setPasteMode(next);
    onItemClick(event);
  };

  const handleShapeSelect = (event: CustomEvent<{ itemId?: string }>) => {
    const id = event.detail?.itemId ?? '';
    setSelectedShape(id);
    console.log('Shape selected:', id);
  };

  return (
    <div className="demo-page">
      <h1>Ribbon</h1>

      <div className="demo-ribbon">
        <div className="controls">
          <button
            className="btn btn-secondary"
            onClick={() => setMinimized((v) => !v)}
          >
            {minimizeLabel}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setLayout((v) => (v === 'classic' ? 'simplified' : 'classic'))}
          >
            {layoutLabel}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setPictureToolsVisible((v) => !v)}
          >
            {pictureToolsVisible ? 'Deselect' : 'Select'} picture
          </button>
          <label className="control-field">
            Version
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value as RibbonVersion)}
            >
              {VERSIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="control-field">
            App accent
            <select
              value={appAccent}
              onChange={(e) => setAppAccent(e.target.value)}
            >
              {APP_ACCENTS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} ({a.value})
                </option>
              ))}
            </select>
          </label>
          <label className="control-field">
            Color scheme
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
            >
              {COLOR_SCHEMES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="control-field">
            Touch mode
            <select
              value={touchMode}
              onChange={(e) => setTouchMode(e.target.value as TouchMode)}
            >
              {TOUCH_MODES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="control-field">
            Direction
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="ribbon-rtl-wrapper" dir={direction}>
          <BsQuickAccessToolbar
            label="Quick Access Toolbar"
            touchMode={touchMode}
            {...{ appAccent } as React.ComponentProps<typeof BsQuickAccessToolbar>}
          >
            <BsRibbonButton
              itemId="qat-save" label="Save" icon="💾" size="small" tooltip="Save (Ctrl+S)"
              onItemClick={onItemClick}
            />
            <BsRibbonButton
              itemId="qat-undo" label="Undo" icon="↶" size="small" tooltip="Undo (Ctrl+Z)"
              onItemClick={onItemClick}
            />
            <BsRibbonButton
              itemId="qat-redo" label="Redo" icon="↷" size="small" tooltip="Redo (Ctrl+Y)"
              onItemClick={onItemClick}
            />
          </BsQuickAccessToolbar>

          <BsRibbon
            minimized={minimized}
            layout={layout}
            version={version}
            colorScheme={colorScheme}
            touchMode={touchMode}
            {...{ appAccent } as React.ComponentProps<typeof BsRibbon>}
            onMinimizeToggle={(e) => setMinimized(e.detail.minimized)}
            onTabChange={(e) => console.log('Tab changed:', e.detail)}
          >
            {/* Tell Me slot (FR-24) */}
            <input
              slot="tell-me"
              type="search"
              className="demo-tell-me"
              placeholder="🔍 Tell me what you want to do…"
              aria-label="Tell me what you want to do"
            />

            {/* ============ Home tab ============ */}
            <BsRibbonTab
              tabId="home"
              label="Home"
              idealSizes={HOME_IDEAL_SIZES}
              reduceOrder={HOME_REDUCE_ORDER}
            >
              <BsRibbonGroup
                groupId="clipboard"
                label="Clipboard"
                dialogLauncher="Clipboard Dialog"
              >
                <BsRibbonSplitButton
                  itemId={pasteMode.id}
                  label={pasteMode.label}
                  icon={pasteMode.icon}
                  size="large"
                  tooltip="Paste (Ctrl+V)"
                  onMainAction={onItemClick}
                >
                  <BsRibbonMenuItem
                    itemId="paste" label="Paste" icon="📋"
                    onMenuSelect={handlePasteModeSelect}
                  />
                  <BsRibbonMenuItem
                    itemId="paste-values" label="Paste Values" icon="123"
                    onMenuSelect={handlePasteModeSelect}
                  />
                  <BsRibbonMenuItem
                    itemId="paste-formatting" label="Paste Formatting" icon="🎨"
                    onMenuSelect={handlePasteModeSelect}
                  />
                  <BsRibbonMenuSeparator />
                  <BsRibbonMenuItem
                    itemId="paste-special" label="Paste Special…"
                    onMenuSelect={onItemClick}
                  />
                </BsRibbonSplitButton>
                <BsRibbonButton
                  itemId="cut" label="Cut" icon="✂️" size="small" tooltip="Cut (Ctrl+X)"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="copy" label="Copy" icon="📄" size="small" tooltip="Copy (Ctrl+C)"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="format-painter" label="Format Painter" icon="🖌️" size="small"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="font"
                label="Font"
                dialogLauncher="Font Dialog"
              >
                <BsRibbonComboBox
                  itemId="font-family"
                  label="Font Family"
                  size="medium"
                  tooltip="Font Family"
                  options={FONT_FAMILY_OPTIONS}
                  value={fontFamily}
                  onValueChange={(e) => setFontFamily(String(e.detail.value))}
                />
                <BsRibbonToggleButton
                  itemId="bold"
                  label="Bold"
                  icon="B"
                  size="small"
                  tooltip="Bold (Ctrl+B)"
                  pressed={boldOn}
                  onToggle={(e) => setBoldOn(e.detail.pressed)}
                />
                <BsRibbonToggleButton
                  itemId="italic"
                  label="Italic"
                  icon="I"
                  size="small"
                  tooltip="Italic (Ctrl+I)"
                  pressed={italicOn}
                  onToggle={(e) => setItalicOn(e.detail.pressed)}
                />
                <BsRibbonToggleButton
                  itemId="underline"
                  label="Underline"
                  icon="U"
                  size="small"
                  tooltip="Underline (Ctrl+U)"
                  pressed={underlineOn}
                  onToggle={(e) => setUnderlineOn(e.detail.pressed)}
                />
                <BsRibbonButton
                  itemId="strikethrough" label="Strikethrough" icon="S̶" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="subscript" label="Subscript" icon="X₂" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="superscript" label="Superscript" icon="X²" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonColorPicker
                  itemId="font-color"
                  label="Font Color"
                  size="small"
                  {...{ value: fontColor } as React.ComponentProps<typeof BsRibbonColorPicker>}
                  onColorChange={(e) => setFontColor(e.detail.color)}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="paragraph"
                label="Paragraph"
                dialogLauncher="Paragraph Dialog"
              >
                <BsRibbonDropdownButton
                  itemId="bullets"
                  label="Bullets"
                  icon="•≡"
                  size="small"
                  tooltip="Bullet list"
                >
                  <BsRibbonMenuItem
                    itemId="bullet-disc" label="Disc" icon="●"
                    onMenuSelect={onItemClick}
                  />
                  <BsRibbonMenuItem
                    itemId="bullet-circle" label="Circle" icon="○"
                    onMenuSelect={onItemClick}
                  />
                  <BsRibbonMenuItem
                    itemId="bullet-square" label="Square" icon="■"
                    onMenuSelect={onItemClick}
                  />
                  <BsRibbonMenuSeparator />
                  <BsRibbonMenuItem
                    itemId="define-new-bullet" label="Define New Bullet…"
                    onMenuSelect={onItemClick}
                  />
                </BsRibbonDropdownButton>
                <BsRibbonButton
                  itemId="numbering" label="Numbering" icon="1≡" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="indent-decrease" label="Decrease Indent" icon="⇤" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="indent-increase" label="Increase Indent" icon="⇥" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonGroupButton
                  itemId="alignment"
                  label="Alignment"
                  size="small"
                  buttons={ALIGNMENT_OPTIONS}
                  {...{ value: alignment } as React.ComponentProps<typeof BsRibbonGroupButton>}
                  onGroupSelect={(e) => setAlignment(String(e.detail.value))}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="styles"
                label="Styles"
                dialogLauncher="Styles"
              >
                <BsRibbonButton
                  itemId="style-normal" label="Normal" icon="¶" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="style-h1" label="Heading 1" icon="H1" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="style-h2" label="Heading 2" icon="H2" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="style-title" label="Title" icon="T" size="medium"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="editing" label="Editing"
              >
                <BsRibbonButton
                  itemId="find" label="Find" icon="🔍" size="small" tooltip="Find (Ctrl+F)"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="replace" label="Replace" icon="🔁" size="small" tooltip="Replace (Ctrl+H)"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="select" label="Select" icon="☐" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonCheckBox
                  itemId="match-case"
                  label="Match case"
                  size="small"
                  checked={matchCase}
                  onCheckChange={(e) => setMatchCase(e.detail.checked)}
                />
              </BsRibbonGroup>
            </BsRibbonTab>

            {/* ============ Insert tab ============ */}
            <BsRibbonTab
              tabId="insert" label="Insert"
            >
              <BsRibbonGroup
                groupId="pages" label="Pages" icon="📑"
              >
                <BsRibbonButton
                  itemId="cover-page" label="Cover Page" icon="📑" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="blank-page" label="Blank Page" icon="📄" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="page-break" label="Page Break" icon="📑" size="medium" tooltip="Insert page break (Ctrl+Enter)"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="tables" label="Tables" icon="▦" priority={10}
              >
                <BsRibbonButton
                  itemId="table" label="Table" icon="▦" size="large"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="shape-gallery" label="Shape Gallery" icon="⬡"
              >
                <BsRibbonGallery
                  itemId="shapes" label="Shapes" size="medium" columns={3}
                >
                  <BsRibbonGalleryItem
                    itemId="rect" icon="▭" label="Rectangle" selected={selectedShape === 'rect'}
                    onGallerySelect={handleShapeSelect}
                  />
                  <BsRibbonGalleryItem
                    itemId="circle" icon="●" label="Circle" selected={selectedShape === 'circle'}
                    onGallerySelect={handleShapeSelect}
                  />
                  <BsRibbonGalleryItem
                    itemId="triangle" icon="▲" label="Triangle" selected={selectedShape === 'triangle'}
                    onGallerySelect={handleShapeSelect}
                  />
                  <BsRibbonGalleryItem
                    itemId="diamond" icon="◆" label="Diamond" selected={selectedShape === 'diamond'}
                    onGallerySelect={handleShapeSelect}
                  />
                  <BsRibbonGalleryItem
                    itemId="star" icon="★" label="Star" selected={selectedShape === 'star'}
                    onGallerySelect={handleShapeSelect}
                  />
                  <BsRibbonGalleryItem
                    itemId="arrow" icon="➤" label="Arrow" selected={selectedShape === 'arrow'}
                    onGallerySelect={handleShapeSelect}
                  />
                </BsRibbonGallery>
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="illustrations" label="Illustrations" icon="🖼️"
              >
                <BsRibbonButton
                  itemId="pictures" label="Pictures" icon="🖼️" size="large"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="shapes" label="Shapes" icon="⬡" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="icons" label="Icons" icon="★" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="chart" label="Chart" icon="📊" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="smartart" label="SmartArt" icon="🧩" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="screenshot" label="Screenshot" icon="📸" size="small"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="links" label="Links" icon="🔗"
              >
                <BsRibbonButton
                  itemId="link" label="Link" icon="🔗" size="medium" tooltip="Insert hyperlink (Ctrl+K)"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="bookmark" label="Bookmark" icon="🔖" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="cross-reference" label="Cross-reference" icon="↗" size="medium"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="header-footer" label="Header & Footer" icon="▤"
              >
                <BsRibbonButton
                  itemId="header" label="Header" icon="▔" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="footer" label="Footer" icon="▁" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="page-number" label="Page Number" icon="#" size="medium"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="text" label="Text" icon="🆎"
              >
                <BsRibbonButton
                  itemId="text-box" label="Text Box" icon="🆎" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="wordart" label="WordArt" icon="🅰️" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="date-time" label="Date & Time" icon="📅" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="symbol" label="Symbol" icon="Ω" size="medium"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>
            </BsRibbonTab>

            {/* ============ Picture Tools (contextual) ============ */}
            <BsRibbonContextualTabSet
              label="Picture Tools"
              color="#F2C744"
              hidden={!pictureToolsVisible}
            >
              <BsRibbonTab
                tabId="picture-format" label="Format"
              >
                <BsRibbonGroup
                  groupId="picture-styles" label="Picture Styles"
                >
                  <BsRibbonButton
                    itemId="picture-border" label="Picture Border" icon="▢" size="medium"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-effects" label="Picture Effects" icon="✨" size="medium"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-layout" label="Picture Layout" icon="🖼️" size="medium"
                    onItemClick={onItemClick}
                  />
                </BsRibbonGroup>
                <BsRibbonGroup
                  groupId="picture-arrange" label="Arrange"
                >
                  <BsRibbonButton
                    itemId="picture-position" label="Position" icon="⤧" size="small"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-wrap-text" label="Wrap Text" icon="↩" size="small"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-rotate" label="Rotate" icon="↻" size="small"
                    onItemClick={onItemClick}
                  />
                </BsRibbonGroup>
                <BsRibbonGroup
                  groupId="picture-size" label="Size"
                >
                  <BsRibbonButton
                    itemId="picture-crop" label="Crop" icon="✂" size="large"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-width" label="Width" icon="↔" size="small"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-height" label="Height" icon="↕" size="small"
                    onItemClick={onItemClick}
                  />
                </BsRibbonGroup>
              </BsRibbonTab>
              <BsRibbonTab
                tabId="picture-effects" label="Effects"
              >
                <BsRibbonGroup
                  groupId="picture-adjust" label="Adjust"
                >
                  <BsRibbonButton
                    itemId="picture-brightness" label="Brightness" icon="🔆" size="medium"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-contrast" label="Contrast" icon="◐" size="medium"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-saturation" label="Saturation" icon="🎨" size="medium"
                    onItemClick={onItemClick}
                  />
                </BsRibbonGroup>
                <BsRibbonGroup
                  groupId="picture-artistic" label="Artistic"
                >
                  <BsRibbonButton
                    itemId="picture-blur" label="Blur" icon="◌" size="small"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-sharpen" label="Sharpen" icon="◇" size="small"
                    onItemClick={onItemClick}
                  />
                  <BsRibbonButton
                    itemId="picture-grayscale" label="Grayscale" icon="◑" size="small"
                    onItemClick={onItemClick}
                  />
                </BsRibbonGroup>
              </BsRibbonTab>
            </BsRibbonContextualTabSet>

            {/* ============ Design tab ============ */}
            <BsRibbonTab
              tabId="design" label="Design"
            >
              <BsRibbonGroup
                groupId="document-formatting" label="Document Formatting"
              >
                <BsRibbonButton
                  itemId="themes" label="Themes" icon="🎨" size="large"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="colors" label="Colors" icon="🌈" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="fonts" label="Fonts" icon="🔤" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="paragraph-spacing" label="Paragraph Spacing" icon="↕" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="effects" label="Effects" icon="✨" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="set-default" label="Set as Default" icon="✓" size="small"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="page-background" label="Page Background"
              >
                <BsRibbonButton
                  itemId="watermark" label="Watermark" icon="💧" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="page-color" label="Page Color" icon="🎨" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="page-borders" label="Page Borders" icon="▢" size="medium"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>
            </BsRibbonTab>

            {/* ============ Layout tab ============ */}
            <BsRibbonTab
              tabId="layout" label="Layout"
            >
              <BsRibbonGroup
                groupId="page-setup" label="Page Setup" dialogLauncher="Page Setup"
              >
                <BsRibbonButton
                  itemId="margins" label="Margins" icon="▭" size="large"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="orientation" label="Orientation" icon="🔄" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="size" label="Size" icon="📏" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="columns" label="Columns" icon="▥" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="breaks" label="Breaks" icon="⤓" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="line-numbers" label="Line Numbers" icon="№" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="hyphenation" label="Hyphenation" icon="‐" size="small"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="paragraph-layout" label="Paragraph" dialogLauncher="Paragraph"
              >
                <BsRibbonButton
                  itemId="indent-left" label="Indent Left" icon="⇥" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="indent-right" label="Indent Right" icon="⇤" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="space-before" label="Space Before" icon="↑≡" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="space-after" label="Space After" icon="↓≡" size="small"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>

              <BsRibbonGroup
                groupId="arrange" label="Arrange"
              >
                <BsRibbonButton
                  itemId="position" label="Position" icon="⤧" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="wrap-text" label="Wrap Text" icon="↩" size="medium"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="bring-forward" label="Bring Forward" icon="⬆" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="send-backward" label="Send Backward" icon="⬇" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="selection-pane" label="Selection Pane" icon="☰" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="align" label="Align" icon="⊟" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="group" label="Group" icon="⊞" size="small"
                  onItemClick={onItemClick}
                />
                <BsRibbonButton
                  itemId="rotate" label="Rotate" icon="↻" size="small"
                  onItemClick={onItemClick}
                />
              </BsRibbonGroup>
            </BsRibbonTab>
          </BsRibbon>
        </div>

        <section className="keymap" aria-labelledby="ribbon-keymap-heading">
          <h3 id="ribbon-keymap-heading">Keyboard shortcuts</h3>
          <p className="keymap-intro">
            The ribbon follows the WAI-ARIA tab + toolbar pattern with Office-style
            shortcuts. Click anywhere in the ribbon first to put focus inside it.
          </p>

          <div className="keymap-grid">
            <article className="keymap-card">
              <h4>Tab strip</h4>
              <dl>
                <dt><kbd>&larr;</kbd> / <kbd>&rarr;</kbd></dt>
                <dd>Move focus to the previous / next tab</dd>
                <dt><kbd>Home</kbd> / <kbd>End</kbd></dt>
                <dd>Jump to the first / last tab</dd>
                <dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt>
                <dd>Activate the focused tab</dd>
                <dt><kbd>Double-click</kbd></dt>
                <dd>Minimize / restore the ribbon</dd>
              </dl>
            </article>

            <article className="keymap-card">
              <h4>Inside a group</h4>
              <dl>
                <dt><kbd>&larr;</kbd> / <kbd>&rarr;</kbd></dt>
                <dd>Rove between items in the same group (wraps at ends)</dd>
                <dt><kbd>Home</kbd> / <kbd>End</kbd></dt>
                <dd>Jump to the first / last item in the group</dd>
                <dt><kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd></dt>
                <dd>Move to the next / previous group (one tabbable per group)</dd>
                <dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt>
                <dd>Activate the focused item</dd>
              </dl>
            </article>

            <article className="keymap-card">
              <h4>Across groups</h4>
              <dl>
                <dt><kbd>Ctrl</kbd>+<kbd>&larr;</kbd> / <kbd>Ctrl</kbd>+<kbd>&rarr;</kbd></dt>
                <dd>Jump focus to the previous / next group inside the active tab</dd>
              </dl>
            </article>

            <article className="keymap-card">
              <h4>Dropdowns, menus &amp; collapsed groups</h4>
              <dl>
                <dt><kbd>&darr;</kbd> / <kbd>Alt</kbd>+<kbd>&darr;</kbd></dt>
                <dd>Open the menu on a dropdown / split button, or on a collapsed group's chevron</dd>
                <dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt>
                <dd>Same as above (activate the trigger). Opens the popup and moves focus into its first item</dd>
                <dt><kbd>&uarr;</kbd> / <kbd>&darr;</kbd></dt>
                <dd>Move highlight between menu items</dd>
                <dt><kbd>&larr;</kbd> / <kbd>&rarr;</kbd></dt>
                <dd>Inside a collapsed group's popup, rove between items the same as inside an expanded group</dd>
                <dt><kbd>Esc</kbd></dt>
                <dd>Close the open menu or popup and return focus to the trigger</dd>
              </dl>
            </article>

            <article className="keymap-card">
              <h4>Ribbon itself</h4>
              <dl>
                <dt><kbd>Ctrl</kbd>+<kbd>F1</kbd></dt>
                <dd>Minimize / restore the ribbon (announced via live region)</dd>
              </dl>
            </article>

            <article className="keymap-card">
              <h4>KeyTips (Office shortcut overlay)</h4>
              <dl>
                <dt><kbd>Alt</kbd></dt>
                <dd>Show or hide the KeyTips overlay. Auto-derived from labels; explicit override via <code>data-key-tip="X"</code></dd>
                <dt><kbd>A</kbd>&ndash;<kbd>Z</kbd></dt>
                <dd>While the overlay is up, press a tip letter to activate that tab. Once a tab opens, press another letter to fire an item</dd>
                <dt><kbd>Esc</kbd></dt>
                <dd>Drop back one level: items &rarr; tabs &rarr; overlay closed</dd>
              </dl>
            </article>

            <article className="keymap-card">
              <h4>Quick Access Toolbar</h4>
              <dl>
                <dt><kbd>&larr;</kbd> / <kbd>&rarr;</kbd></dt>
                <dd>Rove between pinned commands</dd>
                <dt><kbd>Home</kbd> / <kbd>End</kbd></dt>
                <dd>First / last pinned command</dd>
              </dl>
            </article>
          </div>

          <p className="keymap-note">
            Screen-reader users also hear announcements (<code>aria-live="polite"</code>)
            for ribbon minimize / restore, contextual-tab show / hide, and overflow-group
            collapse / expand transitions.
          </p>
        </section>

        <section className="snippets" aria-labelledby="ribbon-snippets-heading">
          <h3 id="ribbon-snippets-heading">Code samples</h3>
          <p className="snippets-intro">
            Copy-paste starting points for the most common ribbon shapes. Every
            element has a React wrapper (<code>Bs*</code>) over a Lit web
            component (<code>mp-*</code>); these snippets show the React form.
          </p>

          <article className="snippet-card">
            <h4>1. Minimal ribbon &mdash; one tab, one group, three buttons</h4>
            <BsCodeSnippet code={SNIPPET_MINIMAL} language="tsx" />
            <p className="snippet-note">
              The <code>minimized</code> prop + <code>onMinimizeToggle</code> handler
              mirror Angular's two-way <code>[(minimized)]</code> &mdash; Ctrl+F1
              and double-clicking a tab will fire the event and update your state.
            </p>
          </article>

          <article className="snippet-card">
            <h4>2. Split-button with a "last-used" menu</h4>
            <BsCodeSnippet code={SNIPPET_SPLIT_BUTTON} language="tsx" />
            <p className="snippet-note">
              The split-button never mutates its own label / icon. Implement the
              "last-used" pattern in your component by updating
              <code>pasteMode</code> inside <code>onPasteModeSelect</code>.
            </p>
          </article>

          <article className="snippet-card">
            <h4>3. Value-bearing items with controlled props</h4>
            <BsCodeSnippet code={SNIPPET_VALUE_ITEMS} language="tsx" />
            <p className="snippet-note">
              Every value-bearing wrapper (toggle-button, check-box, combo-box,
              color-picker, group-button) exposes a value prop + a matching
              <code>on*Change</code> event &mdash; the standard React controlled-component pattern.
            </p>
          </article>

          <article className="snippet-card">
            <h4>4. Contextual tab set</h4>
            <BsCodeSnippet code={SNIPPET_CONTEXTUAL} language="tsx" />
            <p className="snippet-note">
              Toggling <code>hidden</code> on the set fires
              <code>contextual-visibility-change</code>; the ribbon re-processes its
              slot and announces "Picture Tools, contextual, now available / hidden"
              via the live region.
            </p>
          </article>

          <article className="snippet-card">
            <h4>5. Quick Access Toolbar (sibling, not nested)</h4>
            <BsCodeSnippet code={SNIPPET_QAT} language="tsx" />
            <p className="snippet-note">
              The QAT is deliberately rendered as a sibling &mdash; two top-level
              <code>role="toolbar"</code> regions keep the a11y tree flat.
              Persistence of pinned commands is up to your app.
            </p>
          </article>

          <article className="snippet-card">
            <h4>6. Per-app appearance + dark mode</h4>
            <BsCodeSnippet code={SNIPPET_THEMING} language="tsx" />
            <p className="snippet-note">
              <code>version</code> picks one of <code>office-2007</code> /
              <code>2010</code> / <code>2013</code> / <code>2016</code>.
              <code>appAccent</code> drives the brand colour (Word
              <code>#2B579A</code>, Excel <code>#217346</code>, etc.).
              <code>colorScheme="auto"</code> follows
              <code>prefers-color-scheme</code> and ancestor
              <code>data-bs-theme="dark"</code>.
            </p>
          </article>

          <article className="snippet-card">
            <h4>7. Slot-based icons (FR-16)</h4>
            <BsCodeSnippet code={SNIPPET_SLOT_ICONS} language="tsx" />
            <p className="snippet-note">
              Every item exposes a <code>&lt;slot name="icon"&gt;</code> alongside
              the existing <code>icon</code> string attribute. The host's
              <code>size</code> attribute auto-sizes slotted icons via
              <code>::slotted</code> rules; consumers wanting an explicit override
              apply <code>.ribbon-icon-large</code> / <code>-medium</code> /
              <code>-small</code> directly on the projected element. The
              <code>icon=""</code> attribute remains supported as the fallback &mdash;
              consumers can mix-and-match.
            </p>
          </article>
        </section>
      </div>

    </div>
  );
}
