
import {
  DockFloatingStackLayout,
  DockLayout,
  DockLayoutNode,
  DockLayoutSnapshot,
  DockSplitNode,
  DockStackNode,
} from '../types/dock-layout';

type DockPath =
  | { type: 'docked'; segments: number[] }
  | { type: 'floating'; index: number; segments: number[] };

type DockedLocation = { context: 'docked'; path: number[]; node: DockStackNode };
type FloatingLocation = {
  context: 'floating';
  index: number;
  path: number[];
  node: DockStackNode;
};

type ResolvedLocation = DockedLocation | FloatingLocation;

type DropZone = 'center' | 'left' | 'right' | 'top' | 'bottom';

type FloatingResizeEdges = {
  horizontal: 'left' | 'right' | 'none';
  vertical: 'top' | 'bottom' | 'none';
};

const templateHtml = `
  <style>
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      contain: layout paint size style;
      box-sizing: border-box;
      font-family: inherit;
      color: inherit;
    }

    .dock-root,
    .dock-docked,
    .dock-split,
    .dock-split__child,
    .dock-stack,
    .dock-stack__content,
    .dock-stack__pane {
      box-sizing: border-box;
      min-width: 0;
      min-height: 0;
    }

    .dock-root {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .dock-docked {
      position: absolute;
      inset: 0;
      display: flex;
      z-index: 0;
    }

    .dock-floating-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 5;
    }

    .dock-floating {
      position: absolute;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      border: 1px solid rgba(0, 0, 0, 0.3);
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.25);
      overflow: hidden;
      min-width: 12rem;
      min-height: 8rem;
    }

    .dock-floating__chrome {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      cursor: move;
      background: linear-gradient(
        to bottom,
        rgba(148, 163, 184, 0.6),
        rgba(148, 163, 184, 0.25)
      );
      border-bottom: 1px solid rgba(148, 163, 184, 0.5);
      user-select: none;
      -webkit-user-select: none;
    }

    .dock-floating__title {
      flex: 1 1 auto;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(30, 41, 59, 0.95);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dock-floating > .dock-stack {
      flex: 1 1 auto;
      min-width: 12rem;
      min-height: 8rem;
    }

    .dock-floating__resizer {
      position: absolute;
      pointer-events: auto;
      z-index: 2;
      background: rgba(148, 163, 184, 0.25);
      transition: background 120ms ease;
    }

    .dock-floating__resizer:hover {
      background: rgba(148, 163, 184, 0.4);
    }

    .dock-floating__resizer--top,
    .dock-floating__resizer--bottom {
      left: 0.75rem;
      right: 0.75rem;
      height: 0.5rem;
    }

    .dock-floating__resizer--top {
      top: 0;
      cursor: n-resize;
    }

    .dock-floating__resizer--bottom {
      bottom: 0;
      cursor: s-resize;
    }

    .dock-floating__resizer--left,
    .dock-floating__resizer--right {
      top: 1.75rem;
      bottom: 0.75rem;
      width: 0.5rem;
    }

    .dock-floating__resizer--left {
      left: 0;
      cursor: w-resize;
    }

    .dock-floating__resizer--right {
      right: 0;
      cursor: e-resize;
    }

    .dock-floating__resizer--top-left,
    .dock-floating__resizer--top-right,
    .dock-floating__resizer--bottom-left,
    .dock-floating__resizer--bottom-right {
      width: 0.75rem;
      height: 0.75rem;
    }

    .dock-floating__resizer--top-left {
      top: 0;
      left: 0;
      cursor: nw-resize;
    }

    .dock-floating__resizer--top-right {
      top: 0;
      right: 0;
      cursor: ne-resize;
    }

    .dock-floating__resizer--bottom-left {
      bottom: 0;
      left: 0;
      cursor: sw-resize;
    }

    .dock-floating__resizer--bottom-right {
      right: 0;
      bottom: 0;
      cursor: se-resize;
    }

    .dock-split {
      display: flex;
      flex: 1 1 0;
      gap: 0.25rem;
      position: relative;
    }

    .dock-split[data-direction="vertical"] {
      flex-direction: column;
    }

    .dock-split[data-direction="horizontal"] {
      flex-direction: row;
    }

    .dock-split__child {
      display: flex;
      flex: 1 1 0;
      position: relative;
    }

    .dock-split__divider {
      position: relative;
      flex: 0 0 auto;
      background: rgba(0, 0, 0, 0.08);
      transition: background 120ms ease;
    }

    .dock-split[data-direction="horizontal"] > .dock-split__divider {
      width: 0.5rem;
      cursor: col-resize;
    }

    .dock-split[data-direction="vertical"] > .dock-split__divider {
      height: 0.5rem;
      cursor: row-resize;
    }

    .dock-split__divider::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.25);
    }

    .dock-split[data-direction="horizontal"] > .dock-split__divider::after {
      width: 0.125rem;
      height: 60%;
    }

    .dock-split[data-direction="vertical"] > .dock-split__divider::after {
      width: 60%;
      height: 0.125rem;
    }

    .dock-split__divider:hover,
    .dock-split__divider:focus-visible,
    .dock-split__divider[data-resizing='true'] {
      background: rgba(59, 130, 246, 0.35);
    }

    .dock-stack {
      display: flex;
      flex-direction: column;
      flex: 1 1 0;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 0.25rem;
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(4px);
    }

    .dock-stack__header {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      padding: 0.25rem;
      background: rgba(0, 0, 0, 0.05);
      border-bottom: 1px solid rgba(0, 0, 0, 0.15);
    }

    .dock-tab {
      appearance: none;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: grab;
      transition: background 160ms ease;
    }

    .dock-tab:active {
      cursor: grabbing;
    }

    .dock-tab:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .dock-tab:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.8);
      outline-offset: 1px;
    }

    .dock-tab--active {
      background: rgba(59, 130, 246, 0.15);
    }

    .dock-stack__content {
      position: relative;
      flex: 1 1 auto;
      display: flex;
      overflow: hidden;
    }

    .dock-stack__pane {
      position: relative;
      flex: 1 1 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dock-stack__pane[hidden] {
      display: none !important;
    }

    .dock-drop-indicator {
      position: absolute;
      pointer-events: none;
      border: 2px solid rgba(59, 130, 246, 0.9);
      background: rgba(59, 130, 246, 0.2);
      border-radius: 0.25rem;
      opacity: 0;
      transition: opacity 120ms ease;
      z-index: 100;
    }

    .dock-drop-indicator[data-visible='true'] {
      opacity: 1;
    }

    .dock-drop-joystick {
      position: absolute;
      display: grid;
      grid-template-columns: repeat(3, min-content);
      grid-template-rows: repeat(3, min-content);
      gap: 0.125rem;
      padding: 0.125rem;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.15);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
      pointer-events: none;
      opacity: 0;
      transition: opacity 120ms ease;
      transform: translate(-50%, -50%);
      z-index: 110;
    }

    .dock-drop-joystick[data-visible='true'] {
      opacity: 1;
    }

    .dock-drop-joystick__spacer {
      width: 1.75rem;
      height: 1.75rem;
      pointer-events: none;
    }

    .dock-drop-joystick__button {
      width: 1.75rem;
      height: 1.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      border: 1px solid rgba(59, 130, 246, 0.4);
      background: rgba(255, 255, 255, 0.9);
      color: rgba(30, 64, 175, 0.9);
      font-size: 0.75rem;
      line-height: 1;
      font-weight: 600;
      pointer-events: auto;
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
    }

    .dock-drop-joystick__button[data-active='true'],
    .dock-drop-joystick__button:hover,
    .dock-drop-joystick__button:focus-visible {
      background: rgba(59, 130, 246, 0.25);
      border-color: rgba(59, 130, 246, 0.8);
      color: rgba(30, 64, 175, 1);
    }

    .dock-drop-joystick__button:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.9);
      outline-offset: 1px;
    }

    .dock-drop-joystick__button[data-zone='center'] {
      border-radius: 0.5rem;
    }

    ::slotted(*) {
      flex: 1 1 auto;
      display: block;
      min-width: 0;
      min-height: 0;
    }
  </style>
  <div class="dock-root">
    <div class="dock-docked"></div>
    <div class="dock-floating-layer"></div>
  </div>
  <div class="dock-drop-indicator"></div>
  <div class="dock-drop-joystick" data-visible="false">
    <div class="dock-drop-joystick__spacer"></div>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="top"
      aria-label="Dock to top"
    >
      ↑
    </button>
    <div class="dock-drop-joystick__spacer"></div>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="left"
      aria-label="Dock to left"
    >
      ←
    </button>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="center"
      aria-label="Dock to center"
    >
      •
    </button>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="right"
      aria-label="Dock to right"
    >
      →
    </button>
    <div class="dock-drop-joystick__spacer"></div>
    <button
      class="dock-drop-joystick__button"
      type="button"
      data-zone="bottom"
      aria-label="Dock to bottom"
    >
      ↓
    </button>
    <div class="dock-drop-joystick__spacer"></div>
  </div>
`;

let cachedTemplate: HTMLTemplateElement | null = null;
let cachedTemplateDocument: Document | null = null;

function ensureTemplate(documentRef: Document): HTMLTemplateElement {
  if (!cachedTemplate || cachedTemplateDocument !== documentRef) {
    cachedTemplate = documentRef.createElement('template');
    cachedTemplate.innerHTML = templateHtml;
    cachedTemplateDocument = documentRef;
  }

  return cachedTemplate;
}

export class MintDockManagerElement extends HTMLElement {
  private static documentRef: Document | null =
    typeof document !== 'undefined' ? document : null;

  static configureDocument(documentRef: Document | null | undefined): void {
    if (documentRef) {
      MintDockManagerElement.documentRef = documentRef;
    }
  }

  static get observedAttributes(): string[] {
    return ['layout'];
  }

  private static instanceCounter = 0;

  private readonly documentRef: Document;
  private readonly windowRef: (Window & typeof globalThis) | null;
  private readonly rootEl: HTMLElement;
  private readonly dockedEl: HTMLElement;
  private readonly floatingLayerEl: HTMLElement;
  private readonly dropIndicator: HTMLElement;
  private readonly dropJoystick: HTMLElement;
  private readonly dropJoystickButtons: HTMLButtonElement[];
  private readonly instanceId: string;
  private dropJoystickTarget: HTMLElement | null = null;
  private rootLayout: DockLayoutNode | null = null;
  private floatingLayouts: DockFloatingStackLayout[] = [];
  private pendingTabDragMetrics:
    | {
        pointerOffsetX: number;
        pointerOffsetY: number;
        left: number;
        top: number;
        width: number;
        height: number;
      }
    | null = null;
  private resizeState:
    | {
        path: DockPath;
        index: number;
        pointerId: number;
        orientation: 'horizontal' | 'vertical';
        container: HTMLElement;
        divider: HTMLElement;
        startPos: number;
        initialSizes: number[];
        beforeSize: number;
        afterSize: number;
      }
    | null = null;
  private dragState: {
    pane: string;
    sourcePath: DockPath;
    floatingIndex: number | null;
    pointerOffsetX: number;
    pointerOffsetY: number;
    dropHandled: boolean;
  } | null = null;
  private floatingDragState:
    | {
        index: number;
        pointerId: number;
        startX: number;
        startY: number;
        startLeft: number;
        startTop: number;
        wrapper: HTMLElement;
        handle: HTMLElement;
        dropTarget?: { path: DockPath; zone: DropZone };
      }
    | null = null;
  private floatingResizeState:
    | {
        index: number;
        pointerId: number;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
        startLeft: number;
        startTop: number;
        wrapper: HTMLElement;
        handle: HTMLElement;
        edges: FloatingResizeEdges;
      }
    | null = null;
  private pointerTrackingActive = false;
  private dragPointerTrackingActive = false;
  private lastDragPointerPosition: { x: number; y: number } | null = null;
  private pendingDragEndTimeout: number | NodeJS.Timeout | null = null;

  constructor() {
    super();
    const documentRef = this.resolveDocument();
    this.documentRef = documentRef;
    this.windowRef = this.resolveWindow(documentRef);
    const shadowRoot = this.attachShadow({ mode: 'open' });
    const template = ensureTemplate(documentRef);
    shadowRoot.appendChild(template.content.cloneNode(true));
    const root = shadowRoot.querySelector<HTMLElement>('.dock-root');
    if (!root) {
      throw new Error('mint-dock-manager template is missing the root element.');
    }

    const docked = shadowRoot.querySelector<HTMLElement>('.dock-docked');
    if (!docked) {
      throw new Error('mint-dock-manager template is missing the docked surface element.');
    }

    const floatingLayer = shadowRoot.querySelector<HTMLElement>(
      '.dock-floating-layer',
    );
    if (!floatingLayer) {
      throw new Error('mint-dock-manager template is missing the floating layer element.');
    }

    const indicator = shadowRoot.querySelector<HTMLElement>('.dock-drop-indicator');
    if (!indicator) {
      throw new Error('mint-dock-manager template is missing the drop indicator element.');
    }

    const joystick = shadowRoot.querySelector<HTMLElement>('.dock-drop-joystick');
    if (!joystick) {
      throw new Error('mint-dock-manager template is missing the drop joystick element.');
    }

    const joystickButtons = Array.from(
      joystick.querySelectorAll<HTMLButtonElement>('.dock-drop-joystick__button[data-zone]'),
    );
    if (joystickButtons.length === 0) {
      throw new Error('mint-dock-manager template is missing drop joystick buttons.');
    }

    this.rootEl = root;
    this.dockedEl = docked;
    this.floatingLayerEl = floatingLayer;
    this.dropIndicator = indicator;
    this.dropJoystick = joystick;
    this.dropJoystickButtons = joystickButtons;
    this.instanceId = `mint-dock-${++MintDockManagerElement.instanceCounter}`;
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onGlobalDragOver = this.onGlobalDragOver.bind(this);
    this.onGlobalDragEnd = this.onGlobalDragEnd.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.onDragLeave = this.onDragLeave.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.onDragMouseMove = this.onDragMouseMove.bind(this);
    this.onDragTouchMove = this.onDragTouchMove.bind(this);
    this.onDragMouseUp = this.onDragMouseUp.bind(this);
    this.onDragTouchEnd = this.onDragTouchEnd.bind(this);
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'application');
    }
    this.render();
    this.rootEl.addEventListener('dragover', this.onDragOver);
    this.rootEl.addEventListener('drop', this.onDrop);
    this.rootEl.addEventListener('dragleave', this.onDragLeave);
    this.dropJoystick.addEventListener('dragover', this.onDragOver);
    this.dropJoystick.addEventListener('drop', this.onDrop);
    this.dropJoystick.addEventListener('dragleave', this.onDragLeave);
    const win = this.windowRef;
    win?.addEventListener('dragover', this.onGlobalDragOver);
    win?.addEventListener('drag', this.onDrag);
    win?.addEventListener('dragend', this.onGlobalDragEnd, true);
  }

  disconnectedCallback(): void {
    this.rootEl.removeEventListener('dragover', this.onDragOver);
    this.rootEl.removeEventListener('drop', this.onDrop);
    this.rootEl.removeEventListener('dragleave', this.onDragLeave);
    this.dropJoystick.removeEventListener('dragover', this.onDragOver);
    this.dropJoystick.removeEventListener('drop', this.onDrop);
    this.dropJoystick.removeEventListener('dragleave', this.onDragLeave);
    const win = this.windowRef;
    win?.removeEventListener('dragover', this.onGlobalDragOver);
    win?.removeEventListener('drag', this.onDrag);
    win?.removeEventListener('dragend', this.onGlobalDragEnd, true);
    this.stopDragPointerTracking();
    win?.removeEventListener('pointermove', this.onPointerMove);
    win?.removeEventListener('pointerup', this.onPointerUp);
    this.pointerTrackingActive = false;
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'layout') {
      this.layout = newValue ? this.parseLayout(newValue) : null;
    }
  }

  get layout(): DockLayoutSnapshot {
    return {
      root: this.cloneLayoutNode(this.rootLayout),
      floating: this.cloneFloatingArray(this.floatingLayouts),
    };
  }

  set layout(value: DockLayoutSnapshot | DockLayout | DockLayoutNode | null) {
    const snapshot = this.ensureSnapshot(value);
    this.rootLayout = this.cloneLayoutNode(snapshot.root);
    this.floatingLayouts = this.cloneFloatingArray(snapshot.floating);
    this.render();
  }

  get snapshot(): DockLayoutSnapshot {
    return this.layout;
  }

  toJSON(): DockLayoutSnapshot {
    return this.snapshot;
  }

  private resolveDocument(): Document {
    const staticDocument = MintDockManagerElement.documentRef;
    const ownerDocument = this.ownerDocument ?? null;
    const globalDocument =
      typeof document !== 'undefined' ? document : null;
    const resolvedDocument = staticDocument ?? ownerDocument ?? globalDocument;

    if (!resolvedDocument) {
      throw new Error('mint-dock-manager requires a Document to initialize.');
    }

    if (!MintDockManagerElement.documentRef) {
      MintDockManagerElement.documentRef = resolvedDocument;
    }

    return resolvedDocument;
  }

  private resolveWindow(
    documentRef: Document,
  ): (Window & typeof globalThis) | null {
    if (typeof window !== 'undefined') {
      return window;
    }

    return (documentRef.defaultView as (Window & typeof globalThis) | null) ?? null;
  }

  private parseLayout(value: string): DockLayoutSnapshot | null {
    try {
      const parsed = JSON.parse(value) as
        | DockLayoutSnapshot
        | DockLayout
        | DockLayoutNode
        | null;
      return this.ensureSnapshot(parsed);
    } catch (err) {
      console.warn('mint-dock-manager: failed to parse layout attribute', err);
      return null;
    }
  }

  private ensureSnapshot(
    value: DockLayoutSnapshot | DockLayout | DockLayoutNode | null,
  ): DockLayoutSnapshot {
    if (!value) {
      return { root: null, floating: [] };
    }

    if ((value as DockLayoutNode).kind) {
      return { root: value as DockLayoutNode, floating: [] };
    }

    const layout = value as DockLayout | DockLayoutSnapshot;
    return {
      root: layout.root ?? null,
      floating: Array.isArray(layout.floating)
        ? layout.floating.map((floating) => this.normalizeFloatingLayout(floating))
        : [],
    };
  }

  private render(): void {
    this.dockedEl.innerHTML = '';
    this.floatingLayerEl.innerHTML = '';
    this.hideDropIndicator();

    if (this.rootLayout) {
      const fragment = this.renderNode(this.rootLayout, []);
      this.dockedEl.appendChild(fragment);
    }

    this.renderFloatingPanes();
  }

  private renderNode(
    node: DockLayoutNode,
    path: number[],
    floatingIndex?: number,
  ): HTMLElement {
    if (node.kind === 'split') {
      return this.renderSplit(node, path, floatingIndex);
    }

    return this.renderStack(node, path, floatingIndex);
  }

  private renderFloatingPanes(): void {
    this.floatingLayerEl.innerHTML = '';
    this.floatingLayouts.forEach((floating, index) => {
      const wrapper = this.documentRef.createElement('div');
      wrapper.classList.add('dock-floating');
      wrapper.dataset['path'] = this.formatPath({
        type: 'floating',
        index,
        segments: [],
      });

      const { left, top, width, height } = floating.bounds;
      wrapper.style.left = `${left}px`;
      wrapper.style.top = `${top}px`;
      wrapper.style.width = `${width}px`;
      wrapper.style.height = `${height}px`;

      const zIndex = this.getFloatingPaneZIndex(index);
      wrapper.style.zIndex = String(zIndex);

      const chrome = this.documentRef.createElement('div');
      chrome.classList.add('dock-floating__chrome');
      chrome.addEventListener('pointerdown', (event) =>
        this.beginFloatingDrag(event, index, wrapper, chrome),
      );

      const title = this.documentRef.createElement('div');
      title.classList.add('dock-floating__title');
      title.textContent = this.getFloatingWindowTitle(floating);
      chrome.appendChild(title);

      wrapper.appendChild(chrome);

      if (floating.root) {
        const content = this.renderNode(floating.root, [], index);
        content.classList.add('dock-floating__stack');
        wrapper.appendChild(content);
      } else {
        const placeholder = this.documentRef.createElement('div');
        placeholder.classList.add('dock-stack');
        placeholder.dataset['path'] = this.formatPath({
          type: 'floating',
          index,
          segments: [],
        });
        const empty = this.documentRef.createElement('div');
        empty.classList.add('dock-stack__pane');
        empty.textContent = 'No panes configured';
        placeholder.appendChild(empty);
        wrapper.appendChild(placeholder);
      }

      const resizerConfigs: { classes: string[]; edges: FloatingResizeEdges }[] = [
        {
          classes: ['dock-floating__resizer', 'dock-floating__resizer--top-left'],
          edges: { horizontal: 'left', vertical: 'top' },
        },
        {
          classes: ['dock-floating__resizer', 'dock-floating__resizer--top'],
          edges: { horizontal: 'none', vertical: 'top' },
        },
        {
          classes: ['dock-floating__resizer', 'dock-floating__resizer--top-right'],
          edges: { horizontal: 'right', vertical: 'top' },
        },
        {
          classes: ['dock-floating__resizer', 'dock-floating__resizer--right'],
          edges: { horizontal: 'right', vertical: 'none' },
        },
        {
          classes: ['dock-floating__resizer', 'dock-floating__resizer--bottom-right'],
          edges: { horizontal: 'right', vertical: 'bottom' },
        },
        {
          classes: ['dock-floating__resizer', 'dock-floating__resizer--bottom'],
          edges: { horizontal: 'none', vertical: 'bottom' },
        },
        {
          classes: ['dock-floating__resizer', 'dock-floating__resizer--bottom-left'],
          edges: { horizontal: 'left', vertical: 'bottom' },
        },
        {
          classes: ['dock-floating__resizer', 'dock-floating__resizer--left'],
          edges: { horizontal: 'left', vertical: 'none' },
        },
      ];

      resizerConfigs.forEach(({ classes, edges }) => {
        const resizer = this.documentRef.createElement('div');
        resizer.classList.add(...classes);
        resizer.addEventListener('pointerdown', (event) =>
          this.beginFloatingResize(event, index, wrapper, resizer, edges),
        );
        wrapper.appendChild(resizer);
      });
      this.floatingLayerEl.appendChild(wrapper);
    });
  }

  private beginFloatingDrag(
    event: PointerEvent,
    index: number,
    wrapper: HTMLElement,
    handle: HTMLElement,
  ): void {
    const floating = this.floatingLayouts[index];
    if (!floating) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const { left, top } = floating.bounds;

    try {
      handle.setPointerCapture(event.pointerId);
    } catch (err) {
      /* no-op: pointer capture may not be supported in all environments */
    }

    this.promoteFloatingPane(index, wrapper);

    this.floatingDragState = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: left,
      startTop: top,
      wrapper,
      handle,
    };

    this.startPointerTracking();
  }

  private beginFloatingResize(
    event: PointerEvent,
    index: number,
    wrapper: HTMLElement,
    handle: HTMLElement,
    edges: FloatingResizeEdges,
  ): void {
    const floating = this.floatingLayouts[index];
    if (!floating) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    try {
      handle.setPointerCapture(event.pointerId);
    } catch (err) {
      /* pointer capture may not be supported */
    }

    this.promoteFloatingPane(index, wrapper);

    this.floatingResizeState = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: floating.bounds.width,
      startHeight: floating.bounds.height,
      startLeft: floating.bounds.left,
      startTop: floating.bounds.top,
      wrapper,
      handle,
      edges,
    };

    this.startPointerTracking();
  }

  private handleFloatingDragMove(event: PointerEvent): void {
    const state = this.floatingDragState;
    if (!state || event.pointerId !== state.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    const newLeft = state.startLeft + deltaX;
    const newTop = state.startTop + deltaY;

    state.wrapper.style.left = `${newLeft}px`;
    state.wrapper.style.top = `${newTop}px`;

    const floating = this.floatingLayouts[state.index];
    if (floating) {
      floating.bounds.left = newLeft;
      floating.bounds.top = newTop;
    }

    this.updateFloatingDragDropTarget(event);
  }

  private endFloatingDrag(pointerId: number): void {
    const state = this.floatingDragState;
    if (!state || pointerId !== state.pointerId) {
      return;
    }

    try {
      state.handle.releasePointerCapture(state.pointerId);
    } catch (err) {
      /* no-op */
    }

    const dropHandled = state.dropTarget
      ? this.handleFloatingStackDrop(state.index, state.dropTarget.path, state.dropTarget.zone)
      : false;

    this.floatingDragState = null;
    this.hideDropIndicator();
    if (!dropHandled) {
      this.dispatchLayoutChanged();
    }
  }

  private updateFloatingDragDropTarget(event: PointerEvent): void {
    const state = this.floatingDragState;
    if (!state) {
      return;
    }

    const stack = this.findStackAtPoint(event.clientX, event.clientY);
    if (!stack) {
      if (state.dropTarget) {
        delete state.dropTarget;
        this.hideDropIndicator();
      }
      return;
    }

    const path = this.parsePath(stack.dataset['path']);
    if (!path || (path.type === 'floating' && path.index === state.index)) {
      if (state.dropTarget) {
        delete state.dropTarget;
        this.hideDropIndicator();
      }
      return;
    }

    const zone = this.computeDropZone(stack, event, this.extractDropZoneFromEvent(event));

    if (zone) {
      state.dropTarget = { path, zone };
    } else if (state.dropTarget) {
      delete state.dropTarget;
    }

    this.showDropIndicator(stack, zone);
  }

  private handleFloatingResizeMove(event: PointerEvent): void {
    const state = this.floatingResizeState;
    if (!state || event.pointerId !== state.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    const minWidth = 192;
    const minHeight = 128;
    let newWidth = state.startWidth;
    let newHeight = state.startHeight;
    let newLeft = state.startLeft;
    let newTop = state.startTop;

    if (state.edges.horizontal === 'right') {
      newWidth = Math.max(minWidth, state.startWidth + deltaX);
    } else if (state.edges.horizontal === 'left') {
      newWidth = Math.max(minWidth, state.startWidth - deltaX);
      newLeft = state.startLeft + (state.startWidth - newWidth);
    }

    if (state.edges.vertical === 'bottom') {
      newHeight = Math.max(minHeight, state.startHeight + deltaY);
    } else if (state.edges.vertical === 'top') {
      newHeight = Math.max(minHeight, state.startHeight - deltaY);
      newTop = state.startTop + (state.startHeight - newHeight);
    }

    state.wrapper.style.width = `${newWidth}px`;
    state.wrapper.style.height = `${newHeight}px`;
    state.wrapper.style.left = `${newLeft}px`;
    state.wrapper.style.top = `${newTop}px`;

    const floating = this.floatingLayouts[state.index];
    if (floating) {
      floating.bounds.width = newWidth;
      floating.bounds.height = newHeight;
      floating.bounds.left = newLeft;
      floating.bounds.top = newTop;
    }
  }

  private endFloatingResize(pointerId: number): void {
    const state = this.floatingResizeState;
    if (!state || pointerId !== state.pointerId) {
      return;
    }

    try {
      state.handle.releasePointerCapture(state.pointerId);
    } catch (err) {
      /* no-op */
    }

    this.floatingResizeState = null;
    this.dispatchLayoutChanged();
  }

  private getFloatingPaneZIndex(index: number): number {
    const floating = this.floatingLayouts[index];
    if (!floating) {
      return 10 + index;
    }
    const base =
      typeof floating.zIndex === 'number' && Number.isFinite(floating.zIndex)
        ? floating.zIndex
        : 10 + index;
    return base;
  }

  private promoteFloatingPane(index: number, wrapper: HTMLElement): void {
    const floating = this.floatingLayouts[index];
    if (!floating) {
      return;
    }

    const maxExisting = this.floatingLayouts.reduce((max, layout, idx) => {
      if (!layout) {
        return max;
      }
      const z = idx === index ? Number.NEGATIVE_INFINITY : this.getFloatingPaneZIndex(idx);
      return Math.max(max, z);
    }, 0);

    const nextZ = Math.max(maxExisting + 2, 12);
    floating.zIndex = nextZ;
    wrapper.style.zIndex = String(nextZ);
  }

  private getFloatingWrapper(index: number): HTMLElement | null {
    const selector = `.dock-floating[data-path="${this.formatPath({
      type: 'floating',
      index,
      segments: [],
    })}"]`;
    return this.floatingLayerEl.querySelector<HTMLElement>(selector);
  }

  private startPointerTracking(): void {
    if (this.pointerTrackingActive) {
      return;
    }
    const win = this.windowRef;
    win?.addEventListener('pointermove', this.onPointerMove);
    win?.addEventListener('pointerup', this.onPointerUp);
    this.pointerTrackingActive = true;
  }

  private stopPointerTrackingIfIdle(): void {
    if (
      this.pointerTrackingActive &&
      !this.resizeState &&
      !this.floatingDragState &&
      !this.floatingResizeState
    ) {
      const win = this.windowRef;
      win?.removeEventListener('pointermove', this.onPointerMove);
      win?.removeEventListener('pointerup', this.onPointerUp);
      this.pointerTrackingActive = false;
    }
  }

  private getFloatingWindowTitle(floating: DockFloatingStackLayout): string {
    const fallback = 'Floating Pane';
    if (!floating || !floating.root) {
      return fallback;
    }

    const preferred = floating.activePane ?? this.findFirstPaneName(floating.root);
    if (!preferred) {
      return fallback;
    }

    const owningStack = this.findStackContainingPane(floating.root, preferred);
    if (!owningStack) {
      return preferred ?? fallback;
    }

    return owningStack.titles?.[preferred] ?? preferred ?? fallback;
  }

  private updateFloatingWindowTitle(index: number): void {
    const floating = this.floatingLayouts[index];
    if (!floating) {
      return;
    }

    const selector = `.dock-floating[data-path="${this.formatPath({
      type: 'floating',
      index,
      segments: [],
    })}"]`;
    const wrapper = this.floatingLayerEl.querySelector<HTMLElement>(selector);
    if (!wrapper) {
      return;
    }

    const titleEl = wrapper.querySelector<HTMLElement>('.dock-floating__title');
    if (!titleEl) {
      return;
    }

    titleEl.textContent = this.getFloatingWindowTitle(floating);
  }

  private renderSplit(
    node: DockSplitNode,
    path: number[],
    floatingIndex?: number,
  ): HTMLElement {
    const container = this.documentRef.createElement('div');
    container.classList.add('dock-split');
    container.dataset['direction'] = node.direction;
    container.dataset['path'] = path.join('/');

    const sizes = Array.isArray(node.sizes) ? node.sizes : [];
    node.children.forEach((child, index) => {
      const childWrapper = this.documentRef.createElement('div');
      childWrapper.classList.add('dock-split__child');
      childWrapper.dataset['index'] = String(index);

      const size = sizes[index];
      if (typeof size === 'number' && Number.isFinite(size)) {
        childWrapper.style.flex = `${Math.max(size, 0)} 1 0`;
      } else {
        childWrapper.style.flex = '1 1 0';
      }

      childWrapper.appendChild(this.renderNode(child, [...path, index], floatingIndex));
      container.appendChild(childWrapper);

      if (index < node.children.length - 1) {
        const divider = this.documentRef.createElement('div');
        divider.classList.add('dock-split__divider');
        divider.setAttribute('role', 'separator');
        divider.tabIndex = 0;
        divider.addEventListener('pointerdown', (event) =>
          this.beginResize(
            event,
            container,
            floatingIndex !== undefined
              ? { type: 'floating', index: floatingIndex, segments: [...path] }
              : { type: 'docked', segments: [...path] },
            index,
          ),
        );
        container.appendChild(divider);
      }
    });

    return container;
  }

  private renderStack(
    node: DockStackNode,
    path: number[],
    floatingIndex?: number,
  ): HTMLElement {
    const stack = this.documentRef.createElement('div');
    stack.classList.add('dock-stack');
    const location: DockPath =
      typeof floatingIndex === 'number'
        ? { type: 'floating', index: floatingIndex, segments: [...path] }
        : { type: 'docked', segments: [...path] };
    stack.dataset['path'] = this.formatPath(location);

    const header = this.documentRef.createElement('div');
    header.classList.add('dock-stack__header');
    header.setAttribute('role', 'tablist');
    const content = this.documentRef.createElement('div');
    content.classList.add('dock-stack__content');

    const panes = Array.from(new Set(node.panes));
    if (panes.length === 0) {
      const empty = this.documentRef.createElement('div');
      empty.classList.add('dock-stack__pane');
      empty.textContent = 'No panes configured';
      content.appendChild(empty);
      stack.append(header, content);
      return stack;
    }

    const activePane = panes.includes(node.activePane ?? '')
      ? node.activePane!
      : panes[0];

    const baseSlug = path.length ? path.join('-') : 'root';
    const pathSlug =
      typeof floatingIndex === 'number' ? `f${floatingIndex}-${baseSlug}` : baseSlug;
    panes.forEach((paneName) => {
      const paneSlugRaw = paneName.replace(/[^a-zA-Z0-9_-]/g, '-');
      const paneSlug = paneSlugRaw.length > 0 ? paneSlugRaw : 'pane';
      const tabId = `${this.instanceId}-tab-${pathSlug}-${paneSlug}`;
      const panelId = `${this.instanceId}-panel-${pathSlug}-${paneSlug}`;

      const button = this.documentRef.createElement('button');
      button.type = 'button';
      button.classList.add('dock-tab');
      button.dataset['pane'] = paneName;
      button.id = tabId;
      button.textContent = node.titles?.[paneName] ?? paneName;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panelId);
      if (paneName === activePane) {
        button.classList.add('dock-tab--active');
      }
      button.setAttribute('aria-selected', String(paneName === activePane));
      button.draggable = true;
      button.addEventListener('pointerdown', (event) => {
        const stackEl = button.closest<HTMLElement>('.dock-stack');
        this.captureTabDragMetrics(event, stackEl ?? null);
        event.stopPropagation();
      });
      button.addEventListener('pointerup', () => this.clearPendingTabDragMetrics());
      button.addEventListener('pointercancel', () => this.clearPendingTabDragMetrics());
      button.addEventListener('dragstart', (event) => {
        const stackEl = button.closest<HTMLElement>('.dock-stack');
        this.beginPaneDrag(event, this.clonePath(location), paneName, stackEl ?? null);
      });
      button.addEventListener('dragend', () => {
        this.endPaneDrag();
        this.clearPendingTabDragMetrics();
      });
      button.addEventListener('click', () => {
        this.activatePane(stack, paneName, this.clonePath(location));
        this.dispatchEvent(
          new CustomEvent('dock-pane-activated', {
            detail: { pane: paneName },
            bubbles: true,
            composed: true,
          }),
        );
      });
      header.appendChild(button);

      const paneHost = this.documentRef.createElement('div');
      paneHost.classList.add('dock-stack__pane');
      paneHost.dataset['pane'] = paneName;
      paneHost.id = panelId;
      paneHost.setAttribute('role', 'tabpanel');
      paneHost.setAttribute('aria-labelledby', tabId);
      if (paneName !== activePane) {
        paneHost.setAttribute('hidden', '');
      }

      const slotEl = this.documentRef.createElement('slot');
      slotEl.name = paneName;
      paneHost.appendChild(slotEl);
      content.appendChild(paneHost);
    });

    stack.dataset['activePane'] = activePane;
    stack.append(header, content);
    return stack;
  }

  private beginResize(
    event: PointerEvent,
    container: HTMLElement,
    path: DockPath,
    index: number,
  ): void {
    event.preventDefault();
    const divider = event.currentTarget as HTMLElement | null;
    if (!divider) {
      return;
    }

    const orientation = (container.dataset['direction'] as 'horizontal' | 'vertical') ?? 'horizontal';
    const children = Array.from(container.querySelectorAll<HTMLElement>(':scope > .dock-split__child'));
    const initialSizes = children.map((child) => {
      const rect = child.getBoundingClientRect();
      return orientation === 'horizontal' ? rect.width : rect.height;
    });

    const beforeSize = initialSizes[index];
    const afterSize = initialSizes[index + 1];
    const startPos = orientation === 'horizontal' ? event.clientX : event.clientY;

    divider.setPointerCapture(event.pointerId);
    divider.dataset['resizing'] = 'true';
    this.resizeState = {
      path: this.clonePath(path),
      index,
      pointerId: event.pointerId,
      orientation,
      container,
      divider,
      startPos,
      initialSizes,
      beforeSize,
      afterSize,
    };

    this.startPointerTracking();
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.resizeState && event.pointerId === this.resizeState.pointerId) {
      const state = this.resizeState;
      const splitNode = this.resolveSplitNode(state.path);
      if (!splitNode) {
        return;
      }

      const currentPos = state.orientation === 'horizontal' ? event.clientX : event.clientY;
      const delta = currentPos - state.startPos;
      const minSize = 48;
      const pairTotal = state.beforeSize + state.afterSize;

      let newBefore = Math.min(
        Math.max(state.beforeSize + delta, minSize),
        pairTotal - minSize,
      );
      let newAfter = pairTotal - newBefore;

      if (!Number.isFinite(newBefore) || !Number.isFinite(newAfter)) {
        return;
      }

      if (newAfter < minSize) {
        newAfter = minSize;
        newBefore = pairTotal - minSize;
      }

      const newSizesPixels = [...state.initialSizes];
      newSizesPixels[state.index] = newBefore;
      newSizesPixels[state.index + 1] = newAfter;

      const total = newSizesPixels.reduce((acc, size) => acc + size, 0);
      const normalized = total > 0 ? newSizesPixels.map((size) => size / total) : [];

      splitNode.sizes = normalized;
      const children = Array.from(state.container.querySelectorAll<HTMLElement>(':scope > .dock-split__child'));
      normalized.forEach((size, idx) => {
        if (children[idx]) {
          children[idx].style.flex = `${Math.max(size, 0)} 1 0`;
        }
      });
      this.dispatchLayoutChanged();
    }

    if (this.floatingResizeState && event.pointerId === this.floatingResizeState.pointerId) {
      this.handleFloatingResizeMove(event);
    }

    if (this.floatingDragState && event.pointerId === this.floatingDragState.pointerId) {
      this.handleFloatingDragMove(event);
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.resizeState && event.pointerId === this.resizeState.pointerId) {
      const divider = this.resizeState.divider;
      divider.dataset['resizing'] = 'false';
      divider.releasePointerCapture(this.resizeState.pointerId);
      this.resizeState = null;
    }

    if (this.floatingDragState && event.pointerId === this.floatingDragState.pointerId) {
      this.endFloatingDrag(event.pointerId);
    }

    if (this.floatingResizeState && event.pointerId === this.floatingResizeState.pointerId) {
      this.endFloatingResize(event.pointerId);
    }

    this.stopPointerTrackingIfIdle();
  }

  private captureTabDragMetrics(event: PointerEvent, stackEl: HTMLElement | null): void {
    if (!stackEl) {
      this.pendingTabDragMetrics = null;
      return;
    }

    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      this.pendingTabDragMetrics = null;
      return;
    }

    const hostRect = this.getBoundingClientRect();
    const stackRect = stackEl.getBoundingClientRect();

    const pointerOffsetX = event.clientX - stackRect.left;
    const pointerOffsetY = event.clientY - stackRect.top;
    const left = stackRect.left - hostRect.left;
    const top = stackRect.top - hostRect.top;
    const width = Number.isFinite(stackRect.width) ? stackRect.width : 0;
    const height = Number.isFinite(stackRect.height) ? stackRect.height : 0;

    this.pendingTabDragMetrics = {
      pointerOffsetX,
      pointerOffsetY,
      left,
      top,
      width,
      height,
    };
  }

  private clearPendingTabDragMetrics(): void {
    this.pendingTabDragMetrics = null;
  }

  private beginPaneDrag(
    event: DragEvent,
    path: DockPath,
    pane: string,
    stackEl: HTMLElement | null,
  ): void {
    if (!event.dataTransfer) {
      return;
    }

    const {
      path: sourcePath,
      floatingIndex,
      pointerOffsetX,
      pointerOffsetY,
    } = this.preparePaneDragSource(path, pane, stackEl, event);

    this.dragState = {
      pane,
      sourcePath: this.clonePath(sourcePath),
      floatingIndex,
      pointerOffsetX,
      pointerOffsetY,
      dropHandled: false,
    };
    this.updateDraggedFloatingPosition(event);
    this.startDragPointerTracking();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pane);
  }

  private preparePaneDragSource(
    path: DockPath,
    pane: string,
    stackEl: HTMLElement | null,
    event: DragEvent,
  ): { path: DockPath; floatingIndex: number | null; pointerOffsetX: number; pointerOffsetY: number } {
    const location = this.resolveStackLocation(path);
    if (!location || !location.node.panes.includes(pane)) {
      this.clearPendingTabDragMetrics();
      return {
        path,
        floatingIndex: null,
        pointerOffsetX: 0,
        pointerOffsetY: 0,
      };
    }

    const metrics = this.pendingTabDragMetrics;
    this.pendingTabDragMetrics = null;

    const domHasSibling =
      !!stackEl &&
      Array.from(stackEl.querySelectorAll<HTMLElement>('.dock-tab')).some(
        (button) => button.dataset['pane'] && button.dataset['pane'] !== pane,
      );

    const hasSiblingInStack = location.node.panes.some((existing) => existing !== pane);
    const floating = location.context === 'floating' ? this.floatingLayouts[location.index] : null;
    const floatingPaneCount =
      floating && floating.root ? this.countPanesInTree(floating.root) : hasSiblingInStack ? 2 : 1;
    const shouldReuseExistingWindow =
      location.context === 'floating' &&
      !!floating &&
      !hasSiblingInStack &&
      !domHasSibling &&
      floatingPaneCount <= 1;

    if (shouldReuseExistingWindow) {
      if (floating) {
        floating.activePane = pane;
        this.updateFloatingWindowTitle(location.index);
        const wrapper = this.getFloatingWrapper(location.index);
        if (wrapper) {
          this.promoteFloatingPane(location.index, wrapper);
        }
        const hostRect = this.getBoundingClientRect();
        const pointerOffsetX =
          metrics &&
          Number.isFinite(metrics.pointerOffsetX) &&
          Number.isFinite(metrics.left) &&
          Number.isFinite(floating.bounds.left)
            ? metrics.pointerOffsetX + (metrics.left - floating.bounds.left)
            : Number.isFinite(event.clientX) && Number.isFinite(floating.bounds.left)
            ? event.clientX - hostRect.left - floating.bounds.left
            : floating.bounds.width / 2;
        const pointerOffsetY =
          metrics &&
          Number.isFinite(metrics.pointerOffsetY) &&
          Number.isFinite(metrics.top) &&
          Number.isFinite(floating.bounds.top)
            ? metrics.pointerOffsetY + (metrics.top - floating.bounds.top)
            : Number.isFinite(event.clientY) && Number.isFinite(floating.bounds.top)
            ? event.clientY - hostRect.top - floating.bounds.top
            : floating.bounds.height / 2;
        return {
          path,
          floatingIndex: location.index,
          pointerOffsetX,
          pointerOffsetY,
        };
      }
      return {
        path,
        floatingIndex: null,
        pointerOffsetX: 0,
        pointerOffsetY: 0,
      };
    }

    const hostRect = this.getBoundingClientRect();
    const stackRect = stackEl?.getBoundingClientRect() ?? null;
    const fallbackWidth = 320;
    const fallbackHeight = 240;
    const width =
      metrics && Number.isFinite(metrics.width) && metrics.width > 0
        ? metrics.width
        : stackRect && Number.isFinite(stackRect.width)
        ? stackRect.width
        : fallbackWidth;
    const height =
      metrics && Number.isFinite(metrics.height) && metrics.height > 0
        ? metrics.height
        : stackRect && Number.isFinite(stackRect.height)
        ? stackRect.height
        : fallbackHeight;

    const pointerOffsetX =
      metrics && Number.isFinite(metrics.pointerOffsetX)
        ? metrics.pointerOffsetX
        : stackRect && Number.isFinite(event.clientX)
        ? event.clientX - stackRect.left
        : width / 2;
    const pointerOffsetY =
      metrics && Number.isFinite(metrics.pointerOffsetY)
        ? metrics.pointerOffsetY
        : stackRect && Number.isFinite(event.clientY)
        ? event.clientY - stackRect.top
        : height / 2;

    const pointerLeft =
      metrics && Number.isFinite(metrics.left)
        ? metrics.left
        : Number.isFinite(event.clientX)
        ? event.clientX - hostRect.left - pointerOffsetX
        : null;
    const pointerTop =
      metrics && Number.isFinite(metrics.top)
        ? metrics.top
        : Number.isFinite(event.clientY)
        ? event.clientY - hostRect.top - pointerOffsetY
        : null;

    const left =
      pointerLeft !== null
        ? pointerLeft
        : stackRect
        ? stackRect.left - hostRect.left
        : (hostRect.width - width) / 2;
    const top =
      pointerTop !== null
        ? pointerTop
        : stackRect
        ? stackRect.top - hostRect.top
        : (hostRect.height - height) / 2;

    const paneTitle = location.node.titles?.[pane];

    this.removePaneFromLocation(location, pane);

    const floatingStack: DockStackNode = {
      kind: 'stack',
      panes: [pane],
      activePane: pane,
    };
    if (paneTitle) {
      floatingStack.titles = { [pane]: paneTitle };
    }

    const floatingLayout: DockFloatingStackLayout = {
      bounds: {
        left,
        top,
        width,
        height,
      },
      root: floatingStack,
      activePane: pane,
    };
    if (paneTitle) {
      floatingLayout.titles = { [pane]: paneTitle };
    }

    this.floatingLayouts.push(floatingLayout);
    const floatingIndex = this.floatingLayouts.length - 1;

    this.render();

    const wrapper = this.getFloatingWrapper(floatingIndex);
    if (wrapper) {
      this.promoteFloatingPane(floatingIndex, wrapper);
    }

    this.dispatchLayoutChanged();

    return {
      path: { type: 'floating', index: floatingIndex, segments: [] },
      floatingIndex,
      pointerOffsetX,
      pointerOffsetY,
    };
  }

  private endPaneDrag(): void {
    this.clearPendingDragEndTimeout();
    const state = this.dragState;
    this.dragState = null;
    this.hideDropIndicator();
    this.dropJoystick.hidden = true;
    this.stopDragPointerTracking();
    this.lastDragPointerPosition = null;
    if (state && state.floatingIndex !== null && !state.dropHandled) {
      this.dispatchLayoutChanged();
    }
  }

  private onDragOver(event: DragEvent): void {
    if (!this.dragState) {
      return;
    }
    event.preventDefault();
    this.updateDraggedFloatingPosition(event);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const stack = this.findStackElement(event);
    if (!stack) {
      this.hideDropIndicator();
      return;
    }

    const path = this.parsePath(stack.dataset['path']);
    const zone = this.computeDropZone(stack, event, this.extractDropZoneFromEvent(event));
    this.showDropIndicator(stack, zone);
  }

  private updateDraggedFloatingPosition(event: DragEvent): void {
    if (!this.dragState) {
      return;
    }

    const { clientX, clientY, screenX, screenY } = event;
    const hasValidCoordinates =
      Number.isFinite(clientX) &&
      Number.isFinite(clientY) &&
      !(clientX === 0 && clientY === 0 && screenX === 0 && screenY === 0);

    if (hasValidCoordinates) {
      this.lastDragPointerPosition = { x: clientX, y: clientY };
      this.updateDraggedFloatingPositionFromPoint(clientX, clientY);
      return;
    }

    if (this.lastDragPointerPosition) {
      const { x, y } = this.lastDragPointerPosition;
      this.updateDraggedFloatingPositionFromPoint(x, y);
    }
  }

  private onGlobalDragOver(event: DragEvent): void {
    if (!this.dragState) {
      return;
    }
    this.updateDraggedFloatingPosition(event);
  }

  private onDrag(event: DragEvent): void {
    if (!this.dragState) {
      return;
    }
    this.updateDraggedFloatingPosition(event);
  }

  private onGlobalDragEnd(): void {
    this.hideDropIndicator();
    if (!this.dragState) {
      this.clearPendingTabDragMetrics();
      return;
    }
    this.endPaneDrag();
    this.clearPendingTabDragMetrics();
  }

  private updateDraggedFloatingPositionFromPoint(
    clientX: number,
    clientY: number,
  ): void {
    if (!this.dragState) {
      return;
    }

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return;
    }

    this.updatePaneDragDropTargetFromPoint(clientX, clientY);

    const { floatingIndex, pointerOffsetX, pointerOffsetY } = this.dragState;
    if (floatingIndex === null || floatingIndex < 0) {
      return;
    }

    const floating = this.floatingLayouts[floatingIndex];
    if (!floating) {
      return;
    }

    const hostRect = this.getBoundingClientRect();
    const newLeft = clientX - hostRect.left - pointerOffsetX;
    const newTop = clientY - hostRect.top - pointerOffsetY;

    floating.bounds.left = newLeft;
    floating.bounds.top = newTop;

    const wrapper = this.getFloatingWrapper(floatingIndex);
    if (wrapper) {
      wrapper.style.left = `${newLeft}px`;
      wrapper.style.top = `${newTop}px`;
    }
  }

  private updatePaneDragDropTargetFromPoint(clientX: number, clientY: number): void {
    if (!this.dragState) {
      return;
    }

    const stack = this.findStackAtPoint(clientX, clientY);
    if (!stack) {
      this.hideDropIndicator();
      return;
    }

    const path = this.parsePath(stack.dataset['path']);
    if (!path) {
      this.hideDropIndicator();
      return;
    }

    const zoneHint = this.findDropZoneByPoint(clientX, clientY);
    const zone = this.computeDropZone(stack, { clientX, clientY }, zoneHint);
    this.showDropIndicator(stack, zone);
  }

  private startDragPointerTracking(): void {
    if (this.dragPointerTrackingActive) {
      return;
    }
    this.lastDragPointerPosition = null;
    const win = this.windowRef;
    win?.addEventListener('mousemove', this.onDragMouseMove, true);
    win?.addEventListener('touchmove', this.onDragTouchMove, { passive: false });
    win?.addEventListener('mouseup', this.onDragMouseUp, true);
    win?.addEventListener('touchend', this.onDragTouchEnd, true);
    win?.addEventListener('touchcancel', this.onDragTouchEnd, true);
    this.dragPointerTrackingActive = true;
  }

  private stopDragPointerTracking(): void {
    if (!this.dragPointerTrackingActive) {
      return;
    }
    const win = this.windowRef;
    win?.removeEventListener('mousemove', this.onDragMouseMove, true);
    win?.removeEventListener('touchmove', this.onDragTouchMove);
    win?.removeEventListener('mouseup', this.onDragMouseUp, true);
    win?.removeEventListener('touchend', this.onDragTouchEnd, true);
    win?.removeEventListener('touchcancel', this.onDragTouchEnd, true);
    this.dragPointerTrackingActive = false;
    this.lastDragPointerPosition = null;
    this.clearPendingDragEndTimeout();
  }

  private onDragMouseMove(event: MouseEvent): void {
    if (!this.dragState) {
      this.stopDragPointerTracking();
      return;
    }

    if (event.buttons === 0) {
      this.scheduleDeferredDragEnd();
      return;
    }

    this.lastDragPointerPosition = { x: event.clientX, y: event.clientY };
    this.updateDraggedFloatingPositionFromPoint(event.clientX, event.clientY);
  }

  private onDragTouchMove(event: TouchEvent): void {
    if (!this.dragState) {
      this.stopDragPointerTracking();
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      this.scheduleDeferredDragEnd();
      return;
    }

    event.preventDefault();
    this.lastDragPointerPosition = { x: touch.clientX, y: touch.clientY };
    this.updateDraggedFloatingPositionFromPoint(touch.clientX, touch.clientY);
  }

  private onDragMouseUp(): void {
    if (!this.dragState) {
      this.stopDragPointerTracking();
      return;
    }

    this.scheduleDeferredDragEnd();
  }

  private onDragTouchEnd(): void {
    if (!this.dragState) {
      this.stopDragPointerTracking();
      return;
    }

    this.scheduleDeferredDragEnd();
  }

  private clearPendingDragEndTimeout(): void {
    if (this.pendingDragEndTimeout !== null) {
      const win = this.windowRef;
      if (win && typeof this.pendingDragEndTimeout === 'number') {
        win.clearTimeout(this.pendingDragEndTimeout);
      } else {
        globalThis.clearTimeout(this.pendingDragEndTimeout);
      }
      this.pendingDragEndTimeout = null;
    }
  }

  private scheduleDeferredDragEnd(): void {
    if (this.pendingDragEndTimeout !== null) {
      return;
    }

    const completeDrag = () => {
      this.pendingDragEndTimeout = null;
      this.hideDropIndicator();
      if (!this.dragState) {
        this.clearPendingTabDragMetrics();
        return;
      }
      this.endPaneDrag();
      this.clearPendingTabDragMetrics();
    };

    const win = this.windowRef;
    this.pendingDragEndTimeout = win
      ? win.setTimeout(completeDrag, 0)
      : setTimeout(completeDrag, 0);
  }

  private onDrop(event: DragEvent): void {
    if (!this.dragState) {
      return;
    }
    event.preventDefault();

    const pointFromEvent =
      Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
        ? { clientX: event.clientX, clientY: event.clientY }
        : null;

    const point =
      pointFromEvent ??
      (this.lastDragPointerPosition
        ? {
            clientX: this.lastDragPointerPosition.x,
            clientY: this.lastDragPointerPosition.y,
          }
        : null);

    const stack =
      this.findStackElement(event) ??
      (point ? this.findStackAtPoint(point.clientX, point.clientY) : null);

    if (!stack) {
      this.hideDropIndicator();
      this.endPaneDrag();
      return;
    }

    const path = this.parsePath(stack.dataset['path']);
    const eventZoneHint = this.extractDropZoneFromEvent(event);
    const pointZoneHint = point ? this.findDropZoneByPoint(point.clientX, point.clientY) : null;
    const zone = this.computeDropZone(stack, point ?? event, pointZoneHint ?? eventZoneHint);
    if (!zone) {
      this.hideDropIndicator();
      this.endPaneDrag();
      return;
    }
    this.handleDrop(path, zone);
    this.endPaneDrag();
  }

  private onDragLeave(event: DragEvent): void {
    const related = event.relatedTarget as Node | null;
    if (!related) {
      this.hideDropIndicator();
      return;
    }

    const rootContains = this.rootEl.contains(related);
    const joystickContains = this.dropJoystick.contains(related);
    if (!rootContains && !joystickContains) {
      this.hideDropIndicator();
    }
  }

  private handleDrop(targetPath: DockPath | null, zone: DropZone): void {
    if (!this.dragState || !targetPath) {
      return;
    }

    const { pane, sourcePath } = this.dragState;
    const source = this.resolveStackLocation(sourcePath);
    const target = this.resolveStackLocation(targetPath);

    if (!source || !target) {
      return;
    }

    if (zone === 'center' && this.pathsEqual(sourcePath, targetPath)) {
      if (!source.node.panes.includes(pane)) {
        return;
      }
      this.reorderPaneInLocation(source, pane);
      this.render();
      this.dispatchLayoutChanged();
      if (this.dragState) {
        this.dragState.dropHandled = true;
      }
      return;
    }

    const paneTitle = source.node.titles?.[pane];
    const stackEmptied = this.removePaneFromLocation(source, pane, true);

    if (zone === 'center') {
      this.addPaneToLocation(target, pane);
      this.setActivePaneForLocation(target, pane);
      if (paneTitle) {
        target.node.titles = target.node.titles ? { ...target.node.titles } : {};
        target.node.titles[pane] = paneTitle;
      }
      if (stackEmptied) {
        this.cleanupLocation(source);
      }
      this.render();
      this.dispatchLayoutChanged();
      if (this.dragState) {
        this.dragState.dropHandled = true;
      }
      return;
    }

    const newStack: DockStackNode = {
      kind: 'stack',
      panes: [pane],
      activePane: pane,
    };

    if (paneTitle) {
      newStack.titles = { [pane]: paneTitle };
    }

    if (target.context === 'docked') {
      this.rootLayout = this.dockNodeBeside(this.rootLayout, target.node, newStack, zone);
    } else {
      const floating = this.floatingLayouts[target.index];
      if (!floating) {
        if (stackEmptied) {
          this.cleanupLocation(source);
        }
        this.render();
        this.dispatchLayoutChanged();
        return;
      }

      floating.root = this.dockNodeBeside(floating.root, target.node, newStack, zone);
      floating.activePane = pane;
    }

    if (stackEmptied) {
      this.cleanupLocation(source);
    }

    this.render();
    this.dispatchLayoutChanged();
    if (this.dragState) {
      this.dragState.dropHandled = true;
    }
  }

  private handleFloatingStackDrop(sourceIndex: number, targetPath: DockPath, zone: DropZone): boolean {
    const source = this.floatingLayouts[sourceIndex];
    if (!source || !source.root) {
      return false;
    }

    const target = this.resolveStackLocation(targetPath);
    if (!target) {
      return false;
    }

    if (target.context === 'floating' && target.index === sourceIndex) {
      return false;
    }

    if (zone === 'center') {
      const { panes, titles } = this.collectFloatingPaneMetadata(source.root);
      if (panes.length === 0) {
        return false;
      }

      panes.forEach((pane) => {
        this.addPaneToLocation(target, pane);
        const title = titles[pane];
        if (title) {
          target.node.titles = target.node.titles ? { ...target.node.titles } : {};
          target.node.titles[pane] = title;
        }
      });

      const activePane =
        source.activePane && panes.includes(source.activePane)
          ? source.activePane
          : this.findFirstPaneName(source.root) ?? panes[0];

      if (activePane) {
        this.setActivePaneForLocation(target, activePane);
      }

      this.removeFloatingAt(sourceIndex);
      this.render();
      this.dispatchLayoutChanged();
      return true;
    }

    if (target.context === 'floating') {
      const floating = this.floatingLayouts[target.index];
      if (!floating) {
        return false;
      }

      floating.root = this.dockNodeBeside(floating.root, target.node, source.root, zone);
      floating.activePane = source.activePane ?? this.findFirstPaneName(source.root) ?? undefined;
      this.removeFloatingAt(sourceIndex);
      this.render();
      this.dispatchLayoutChanged();
      return true;
    }

    this.rootLayout = this.dockNodeBeside(this.rootLayout, target.node, source.root, zone);
    this.removeFloatingAt(sourceIndex);
    this.render();
    this.dispatchLayoutChanged();
    return true;
  }

  private insertWeight(sizes: number[] | undefined, index: number, totalChildren: number): number[] {
    const existingCount = totalChildren - 1;
    const normalized = this.normalizeSizesArray(sizes, existingCount);
    const newWeight = 1 / totalChildren;
    const remaining = 1 - newWeight;
    const result: number[] = [];
    for (let i = 0; i < totalChildren; i += 1) {
      if (i === index) {
        result.push(newWeight);
      } else {
        const sourceIndex = i < index ? i : i - 1;
        result.push(normalized[sourceIndex] * remaining);
      }
    }
    return result;
  }

  private removePaneFromStack(stack: DockStackNode, pane: string, skipCleanup = false): boolean {
    stack.panes = stack.panes.filter((p) => p !== pane);
    if (!stack.panes.includes(stack.activePane ?? '')) {
      if (stack.panes.length > 0) {
        stack.activePane = stack.panes[0];
      } else {
        delete stack.activePane;
      }
    }

    if (stack.panes.length > 0) {
      return false;
    }

    if (skipCleanup) {
      return true;
    }

    this.rootLayout = this.cleanupEmptyStackInTree(this.rootLayout, stack);
    return true;
  }

  private findParentSplit(
    node: DockLayoutNode | null,
    child: DockLayoutNode,
  ): { parent: DockSplitNode; index: number } | null {
    if (!node || node === child) {
      return null;
    }

    if (node.kind !== 'split') {
      return null;
    }

    const index = node.children.indexOf(child);
    if (index !== -1) {
      return { parent: node, index };
    }

    for (let i = 0; i < node.children.length; i += 1) {
      const result = this.findParentSplit(node.children[i], child);
      if (result) {
        return result;
      }
    }

    return null;
  }

  private computeDropZone(
    stack: HTMLElement,
    point: { clientX: number; clientY: number } | null,
    zoneHint?: DropZone | null,
  ): DropZone | null {
    const hintedZone = this.isDropZone(zoneHint) ? zoneHint : null;
    if (hintedZone) {
      this.updateDropJoystickActiveZone(hintedZone);
      return hintedZone;
    }

    const pointZone =
      point &&
      Number.isFinite(point.clientX) &&
      Number.isFinite(point.clientY)
        ? this.findDropZoneByPoint(point.clientX, point.clientY)
        : null;

    if (pointZone) {
      this.updateDropJoystickActiveZone(pointZone);
      return pointZone;
    }

    if (this.dropJoystickTarget === stack) {
      this.updateDropJoystickActiveZone(null);
    }

    return null;
  }

  private extractDropZoneFromEvent(event: Event): DropZone | null {
    if (!event) {
      return null;
    }

    if (typeof (event as DragEvent).composedPath === 'function') {
      const path = (event as DragEvent).composedPath();
      for (const target of path) {
        if (
          target instanceof HTMLElement &&
          target.classList.contains('dock-drop-joystick__button')
        ) {
          const zone = target.dataset?.['zone'];
          if (this.isDropZone(zone)) {
            return zone;
          }
        }
      }
    }

    if ('clientX' in event && 'clientY' in event) {
      const pointEvent = event as MouseEvent;
      const zoneFromPoint = this.findDropZoneByPoint(pointEvent.clientX, pointEvent.clientY);
      if (zoneFromPoint) {
        return zoneFromPoint;
      }
    }

    return null;
  }

  private findDropZoneByPoint(clientX: number, clientY: number): DropZone | null {
    if (
      !this.dropJoystickButtons ||
      this.dropJoystick.dataset['visible'] !== 'true' ||
      !this.dropJoystickTarget
    ) {
      return null;
    }

    for (const button of this.dropJoystickButtons) {
      const rect = button.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        const zone = button.dataset['zone'];
        if (this.isDropZone(zone)) {
          return zone;
        }
      }
    }

    return null;
  }

  private updateDropJoystickActiveZone(zone: DropZone | null): void {
    this.dropJoystickButtons.forEach((button) => {
      const isActive = zone !== null && button.dataset['zone'] === zone;
      if (isActive) {
        button.dataset['active'] = 'true';
      } else {
        delete button.dataset['active'];
      }
    });
    if (zone) {
      this.dropJoystick.dataset['zone'] = zone;
    } else {
      delete this.dropJoystick.dataset['zone'];
    }
  }

  private isDropZone(value: string | null | undefined): value is DropZone {
    return value === 'left' || value === 'right' || value === 'top' || value === 'bottom' || value === 'center';
  }

  private showDropIndicator(stack: HTMLElement, zone: DropZone | null): void {
    const rect = stack.getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    const indicator = this.dropIndicator;
    const joystick = this.dropJoystick;

    joystick.hidden = false;

    const path = this.parsePath(stack.dataset['path']);
    let overlayZ = 100;
    if (path && path.type === 'floating') {
      overlayZ = this.getFloatingPaneZIndex(path.index) + 100;
    }
    indicator.style.zIndex = String(overlayZ);
    joystick.style.zIndex = String(overlayZ + 1);

    let left = rect.left - hostRect.left;
    let top = rect.top - hostRect.top;
    let width = rect.width;
    let height = rect.height;

    const portion = 0.5;

    if (zone) {
      switch (zone) {
        case 'left':
          width = rect.width * portion;
          break;
        case 'right':
          width = rect.width * portion;
          left += rect.width * (1 - portion);
          break;
        case 'top':
          height = rect.height * portion;
          break;
        case 'bottom':
          height = rect.height * portion;
          top += rect.height * (1 - portion);
          break;
        default:
          break;
      }

      indicator.style.left = `${left}px`;
      indicator.style.top = `${top}px`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
      indicator.dataset['visible'] = 'true';
    } else {
      indicator.dataset['visible'] = 'false';
    }

    joystick.style.left = `${rect.left - hostRect.left + rect.width / 2}px`;
    joystick.style.top = `${rect.top - hostRect.top + rect.height / 2}px`;
    joystick.dataset['visible'] = 'true';
    joystick.dataset['path'] = stack.dataset['path'] ?? '';
    this.dropJoystickTarget = stack;
    this.updateDropJoystickActiveZone(zone);
  }

  private hideDropIndicator(): void {
    this.dropIndicator.dataset['visible'] = 'false';
    this.dropJoystick.dataset['visible'] = 'false';
    delete this.dropJoystick.dataset['path'];
    this.dropJoystickTarget = null;
    this.updateDropJoystickActiveZone(null);
  }

  private findStackAtPoint(clientX: number, clientY: number): HTMLElement | null {
    const shadow = this.shadowRoot;
    if (!shadow) {
      return null;
    }

    const elements = shadow.elementsFromPoint(clientX, clientY);
    for (const element of elements) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }
      if (element.classList.contains('dock-stack')) {
        return element;
      }
      if (
        this.dropJoystickTarget &&
        (element.classList.contains('dock-drop-joystick') ||
          element.classList.contains('dock-drop-joystick__button') ||
          element.classList.contains('dock-drop-joystick__spacer'))
      ) {
        return this.dropJoystickTarget;
      }
    }

    return null;
  }

  private findStackElement(event: DragEvent): HTMLElement | null {
    const path = event.composedPath();
    for (const target of path) {
      if (!(target instanceof HTMLElement)) {
        continue;
      }
      if (target.classList.contains('dock-stack')) {
        return target;
      }
      if (
        this.dropJoystickTarget &&
        (target.classList.contains('dock-drop-joystick') ||
          target.classList.contains('dock-drop-joystick__button') ||
          target.classList.contains('dock-drop-joystick__spacer'))
      ) {
        return this.dropJoystickTarget;
      }
    }
    return null;
  }

  private activatePane(stack: HTMLElement, paneName: string, path: DockPath): void {
    stack.dataset['activePane'] = paneName;

    const headerButtons = stack.querySelectorAll<HTMLButtonElement>('.dock-tab');
    headerButtons.forEach((button) => {
      const isSelected = button.dataset['pane'] === paneName;
      button.classList.toggle('dock-tab--active', isSelected);
      button.setAttribute('aria-selected', String(isSelected));
    });

    const panes = stack.querySelectorAll<HTMLElement>('.dock-stack__pane');
    panes.forEach((pane) => {
      if (pane.dataset['pane'] === paneName) {
        pane.removeAttribute('hidden');
      } else {
        pane.setAttribute('hidden', '');
      }
    });

    const location = this.resolveStackLocation(path);
    if (!location) {
      return;
    }

    location.node.activePane = paneName;
    if (path.type === 'floating') {
      const floating = this.floatingLayouts[path.index];
      if (floating) {
        floating.activePane = paneName;
      }
      this.updateFloatingWindowTitle(path.index);
    }
    this.dispatchLayoutChanged();
  }

  private getNodeAtPath(root: DockLayoutNode | null, path: number[]): DockLayoutNode | null {
    if (!root) {
      return null;
    }

    let current: DockLayoutNode | null = root;
    if (path.length === 0) {
      return current;
    }

    for (const segment of path) {
      if (!current || current.kind !== 'split') {
        return null;
      }
      current = current.children[segment] ?? null;
    }

    return current;
  }

  private resolveSplitNode(path: DockPath): DockSplitNode | null {
    if (path.type === 'docked') {
      const node = this.getNodeAtPath(this.rootLayout, path.segments);
      return node && node.kind === 'split' ? node : null;
    }

    const floating = this.floatingLayouts[path.index];
    if (!floating || !floating.root) {
      return null;
    }

    const node = this.getNodeAtPath(floating.root, path.segments);
    return node && node.kind === 'split' ? node : null;
  }

  private replaceNodeInTree(
    root: DockLayoutNode | null,
    target: DockLayoutNode,
    replacement: DockLayoutNode,
  ): DockLayoutNode | null {
    if (!root) {
      return replacement;
    }

    if (root === target) {
      return replacement;
    }

    const parentInfo = this.findParentSplit(root, target);
    if (!parentInfo) {
      return root;
    }

    parentInfo.parent.children[parentInfo.index] = replacement;
    this.normalizeSplitNode(parentInfo.parent);
    return root;
  }

  private cleanupEmptyStackInTree(
    root: DockLayoutNode | null,
    stack: DockStackNode,
  ): DockLayoutNode | null {
    if (!root || stack.panes.length > 0) {
      return root;
    }

    const parentInfo = this.findParentSplit(root, stack);
    if (!parentInfo) {
      return root === stack ? null : root;
    }

    const parent = parentInfo.parent;
    const index = parent.children.indexOf(stack);
    if (index === -1) {
      return root;
    }

    parent.children.splice(index, 1);
    if (Array.isArray(parent.sizes)) {
      parent.sizes.splice(index, 1);
    }
    this.normalizeSplitNode(parent);

    return this.cleanupSplitIfNecessary(root, parent);
  }

  private cleanupSplitIfNecessary(
    root: DockLayoutNode | null,
    split: DockSplitNode,
  ): DockLayoutNode | null {
    if (split.children.length === 1) {
      return this.replaceNodeInTree(root, split, split.children[0]);
    }

    if (split.children.length === 0) {
      const parentInfo = this.findParentSplit(root, split);
      if (!parentInfo) {
        return null;
      }

      const parent = parentInfo.parent;
      const index = parent.children.indexOf(split);
      if (index !== -1) {
        parent.children.splice(index, 1);
        if (Array.isArray(parent.sizes)) {
          parent.sizes.splice(index, 1);
        }
        this.normalizeSplitNode(parent);
        return this.cleanupSplitIfNecessary(root, parent);
      }
    }

    return root;
  }

  private dockNodeBeside(
    root: DockLayoutNode | null,
    targetNode: DockStackNode,
    newNode: DockLayoutNode,
    zone: DropZone,
  ): DockLayoutNode | null {
    const orientation = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
    const placeBefore = zone === 'left' || zone === 'top';
    const parentInfo = this.findParentSplit(root, targetNode);

    if (parentInfo && parentInfo.parent.direction === orientation) {
      const insertIndex = placeBefore ? parentInfo.index : parentInfo.index + 1;
      parentInfo.parent.children.splice(insertIndex, 0, newNode);
      parentInfo.parent.sizes = this.insertWeight(
        parentInfo.parent.sizes,
        insertIndex,
        parentInfo.parent.children.length,
      );
      return root ?? newNode;
    }

    const split: DockSplitNode = {
      kind: 'split',
      direction: orientation,
      children: placeBefore ? [newNode, targetNode] : [targetNode, newNode],
      sizes: [0.5, 0.5],
    };

    return this.replaceNodeInTree(root, targetNode, split);
  }

  private forEachStack(
    node: DockLayoutNode | null,
    visitor: (stack: DockStackNode, path: number[]) => void,
    path: number[] = [],
  ): void {
    if (!node) {
      return;
    }

    if (node.kind === 'stack') {
      visitor(node, path);
      return;
    }

    node.children.forEach((child, index) =>
      this.forEachStack(child, visitor, [...path, index]),
    );
  }

  private findStackContainingPane(
    node: DockLayoutNode | null,
    pane: string,
  ): DockStackNode | null {
    let result: DockStackNode | null = null;
    this.forEachStack(node, (stack) => {
      if (!result && stack.panes.includes(pane)) {
        result = stack;
      }
    });
    return result;
  }

  private findFirstPaneName(node: DockLayoutNode | null): string | null {
    let found: string | null = null;
    this.forEachStack(node, (stack) => {
      if (found || stack.panes.length === 0) {
        return;
      }
      if (stack.activePane && stack.panes.includes(stack.activePane)) {
        found = stack.activePane;
      } else {
        found = stack.panes[0];
      }
    });
    return found;
  }

  private collectFloatingPaneMetadata(
    node: DockLayoutNode | null,
  ): { panes: string[]; titles: Record<string, string> } {
    const panes: string[] = [];
    const titles: Record<string, string> = {};
    this.forEachStack(node, (stack) => {
      stack.panes.forEach((pane) => {
        panes.push(pane);
        const title = stack.titles?.[pane];
        if (title) {
          titles[pane] = title;
        }
      });
    });
    return { panes, titles };
  }

  private normalizeFloatingLayout(
    layout: DockFloatingStackLayout,
  ): DockFloatingStackLayout {
    const bounds = layout.bounds ?? { left: 0, top: 0, width: 320, height: 200 };
    const normalizedBounds = {
      left: Number.isFinite(bounds.left) ? bounds.left : 0,
      top: Number.isFinite(bounds.top) ? bounds.top : 0,
      width: Number.isFinite(bounds.width) ? Math.max(bounds.width, 160) : 320,
      height: Number.isFinite(bounds.height) ? Math.max(bounds.height, 120) : 200,
    };

    let root = layout.root ? this.cloneLayoutNode(layout.root) : null;

    if (!root) {
      const panes = Array.isArray(layout.panes) ? [...layout.panes] : [];
      if (panes.length > 0) {
        const active =
          layout.activePane && panes.includes(layout.activePane)
            ? layout.activePane
            : panes[0];
        root = {
          kind: 'stack',
          panes,
          titles: layout.titles ? { ...layout.titles } : undefined,
          activePane: active,
        };
      }
    }

    return {
      id: layout.id,
      bounds: normalizedBounds,
      zIndex: layout.zIndex,
      root,
      activePane: layout.activePane,
    };
  }

  private formatPath(path: DockPath): string {
    if (path.type === 'floating') {
      const suffix =
        path.segments.length > 0
          ? `/${path.segments.map((segment) => segment.toString()).join('/')}`
          : '';
      return `f:${path.index}${suffix}`;
    }
    const suffix = path.segments.join('/');
    return suffix.length > 0 ? `d:${suffix}` : 'd:';
  }

  private clonePath(path: DockPath): DockPath {
    if (path.type === 'floating') {
      return { type: 'floating', index: path.index, segments: [...path.segments] };
    }
    return { type: 'docked', segments: [...path.segments] };
  }

  private parsePath(path: string | null | undefined): DockPath | null {
    if (!path) {
      return null;
    }

    if (path.startsWith('f:')) {
      const remainder = path.slice(2);
      const [indexPart, ...segmentParts] = remainder.split('/');
      const index = Number.parseInt(indexPart, 10);
      if (!Number.isFinite(index)) {
        return null;
      }
      const segments = segmentParts
        .filter((segment) => segment.length > 0)
        .map((segment) => Number.parseInt(segment, 10))
        .filter((value) => Number.isFinite(value));
      return { type: 'floating', index, segments };
    }

    const normalized = path.startsWith('d:') ? path.slice(2) : path;
    if (normalized.length === 0) {
      return { type: 'docked', segments: [] };
    }

    const segments = normalized
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => Number.parseInt(segment, 10))
      .filter((value) => Number.isFinite(value));

    return { type: 'docked', segments };
  }

  private pathsEqual(a: DockPath, b: DockPath): boolean {
    if (a.type !== b.type) {
      return false;
    }

    if (a.type === 'floating') {
      const other = b as Extract<DockPath, { type: 'floating' }>;
      if (a.index !== other.index) {
        return false;
      }
      if (a.segments.length !== other.segments.length) {
        return false;
      }
      return a.segments.every((value, index) => value === other.segments[index]);
    }

    const other = b as Extract<DockPath, { type: 'docked' }>;
    if (a.segments.length !== other.segments.length) {
      return false;
    }

    return a.segments.every((value, index) => value === other.segments[index]);
  }

  private countPanesInTree(node: DockLayoutNode | null): number {
    if (!node) {
      return 0;
    }
    if (node.kind === 'stack') {
      return node.panes.length;
    }
    return node.children.reduce((total, child) => total + this.countPanesInTree(child), 0);
  }

  private resolveStackLocation(path: DockPath): ResolvedLocation | null {
    if (path.type === 'floating') {
      const layout = this.floatingLayouts[path.index];
      if (!layout || !layout.root) {
        return null;
      }
      const node = this.getNodeAtPath(layout.root, path.segments);
      if (!node || node.kind !== 'stack') {
        return null;
      }
      return { context: 'floating', index: path.index, path: [...path.segments], node };
    }

    const node = this.getNodeAtPath(this.rootLayout, path.segments);
    if (!node || node.kind !== 'stack') {
      return null;
    }

    return { context: 'docked', path: [...path.segments], node };
  }

  private removePaneFromLocation(
    location: ResolvedLocation,
    pane: string,
    skipCleanup = false,
  ): boolean {
    if (location.context === 'docked') {
      return this.removePaneFromStack(location.node, pane, skipCleanup);
    }

    return this.removePaneFromFloating(location.index, location.path, pane, skipCleanup);
  }

  private addPaneToLocation(location: ResolvedLocation, pane: string): void {
    const panes = location.node.panes;
    const existingIndex = panes.indexOf(pane);
    if (existingIndex !== -1) {
      panes.splice(existingIndex, 1);
    }
    panes.push(pane);
  }

  private setActivePaneForLocation(location: ResolvedLocation, pane: string): void {
    location.node.activePane = pane;
    if (location.context === 'floating') {
      const floating = this.floatingLayouts[location.index];
      if (floating) {
        floating.activePane = pane;
      }
    }
  }

  private cleanupLocation(location: ResolvedLocation): void {
    if (location.context === 'docked') {
      this.rootLayout = this.cleanupEmptyStackInTree(this.rootLayout, location.node);
    } else {
      const floating = this.floatingLayouts[location.index];
      if (!floating) {
        return;
      }

      floating.root = this.cleanupEmptyStackInTree(floating.root, location.node);
      if (!floating.root) {
        this.removeFloatingAt(location.index);
      }
    }
  }

  private reorderPaneInLocation(location: ResolvedLocation, pane: string): void {
    const panes = location.node.panes;
    const index = panes.indexOf(pane);
    if (index === -1) {
      return;
    }
    panes.splice(index, 1);
    panes.push(pane);
    location.node.activePane = pane;
    if (location.context === 'floating') {
      const floating = this.floatingLayouts[location.index];
      if (floating) {
        floating.activePane = pane;
      }
    }
  }

  private removeFloatingAt(index: number): void {
    if (index < 0 || index >= this.floatingLayouts.length) {
      return;
    }
    this.floatingLayouts.splice(index, 1);
  }

  private removePaneFromFloating(
    index: number,
    path: number[],
    pane: string,
    skipCleanup = false,
  ): boolean {
    const floating = this.floatingLayouts[index];
    if (!floating || !floating.root) {
      return false;
    }

    const node = this.getNodeAtPath(floating.root, path);
    if (!node || node.kind !== 'stack') {
      return false;
    }

    node.panes = node.panes.filter((p) => p !== pane);
    if (!node.panes.includes(node.activePane ?? '')) {
      if (node.panes.length > 0) {
        node.activePane = node.panes[0];
      } else {
        delete node.activePane;
      }
    }

    if (floating.activePane === pane) {
      const fallback = this.findFirstPaneName(floating.root);
      if (fallback) {
        floating.activePane = fallback;
      } else {
        delete floating.activePane;
      }
    }

    if (node.panes.length > 0) {
      return false;
    }

    if (skipCleanup) {
      return true;
    }

    floating.root = this.cleanupEmptyStackInTree(floating.root, node);
    if (!floating.root) {
      this.removeFloatingAt(index);
    }

    return true;
  }

  private normalizeSizesArray(sizes: number[] | undefined, count: number): number[] {
    if (count <= 0) {
      return [];
    }

    if (!Array.isArray(sizes) || sizes.length !== count) {
      return Array.from({ length: count }, () => 1 / count);
    }

    const normalized = sizes.map((value) => (Number.isFinite(value) ? Math.max(value, 0) : 0));
    const total = normalized.reduce((acc, value) => acc + value, 0);
    if (total <= 0) {
      return Array.from({ length: count }, () => 1 / count);
    }

    return normalized.map((value) => value / total);
  }

  private normalizeSplitNode(split: DockSplitNode): void {
    split.sizes = this.normalizeSizesArray(split.sizes, split.children.length);
  }

  private dispatchLayoutChanged(): void {
    this.dispatchEvent(
      new CustomEvent('dock-layout-changed', {
        detail: this.snapshot,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private cloneLayoutNode(layout: DockLayoutNode): DockLayoutNode;
  private cloneLayoutNode(layout: DockLayoutNode | null): DockLayoutNode | null;
  private cloneLayoutNode(layout: DockLayoutNode | null): DockLayoutNode | null {
    if (!layout) {
      return null;
    }

    return JSON.parse(JSON.stringify(layout)) as DockLayoutNode;
  }

  private cloneFloatingArray(
    layouts: DockFloatingStackLayout[],
  ): DockFloatingStackLayout[] {
    return JSON.parse(JSON.stringify(layouts)) as DockFloatingStackLayout[];
  }
}

const tagName = 'mint-dock-manager';

if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
  customElements.define(tagName, MintDockManagerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mint-dock-manager': MintDockManagerElement;
  }
}
