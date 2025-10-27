
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
  | { type: 'floating'; index: number };

type DockedLocation = { context: 'docked'; path: number[]; node: DockStackNode };
type FloatingLocation = {
  context: 'floating';
  index: number;
  node: DockFloatingStackLayout;
};

type ResolvedLocation = DockedLocation | FloatingLocation;

type DropZone = 'center' | 'left' | 'right' | 'top' | 'bottom';

const template = document.createElement('template');

template.innerHTML = `
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
`;

export class MintDockManagerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['layout'];
  }

  private static instanceCounter = 0;

  private readonly rootEl: HTMLElement;
  private readonly dockedEl: HTMLElement;
  private readonly floatingLayerEl: HTMLElement;
  private readonly dropIndicator: HTMLElement;
  private readonly instanceId: string;
  private rootLayout: DockLayoutNode | null = null;
  private floatingLayouts: DockFloatingStackLayout[] = [];
  private resizeState:
    | {
        path: number[];
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
      }
    | null = null;
  private pointerTrackingActive = false;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
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

    this.rootEl = root;
    this.dockedEl = docked;
    this.floatingLayerEl = floatingLayer;
    this.dropIndicator = indicator;
    this.instanceId = `mint-dock-${++MintDockManagerElement.instanceCounter}`;
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.onDragLeave = this.onDragLeave.bind(this);
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'application');
    }
    this.render();
    this.rootEl.addEventListener('dragover', this.onDragOver);
    this.rootEl.addEventListener('drop', this.onDrop);
    this.rootEl.addEventListener('dragleave', this.onDragLeave);
  }

  disconnectedCallback(): void {
    this.rootEl.removeEventListener('dragover', this.onDragOver);
    this.rootEl.removeEventListener('drop', this.onDrop);
    this.rootEl.removeEventListener('dragleave', this.onDragLeave);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
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
      floating: Array.isArray(layout.floating) ? [...layout.floating] : [],
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

  private renderNode(node: DockLayoutNode, path: number[]): HTMLElement {
    if (node.kind === 'split') {
      return this.renderSplit(node, path);
    }

    return this.renderStack(node, path);
  }

  private renderFloatingPanes(): void {
    this.floatingLayerEl.innerHTML = '';
    this.floatingLayouts.forEach((floating, index) => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('dock-floating');
      wrapper.dataset['path'] = this.formatPath({
        type: 'floating',
        index,
      });

      const { left, top, width, height } = floating.bounds;
      wrapper.style.left = `${left}px`;
      wrapper.style.top = `${top}px`;
      wrapper.style.width = `${width}px`;
      wrapper.style.height = `${height}px`;

      const zIndex = this.getFloatingPaneZIndex(index);
      wrapper.style.zIndex = String(zIndex);

      const chrome = document.createElement('div');
      chrome.classList.add('dock-floating__chrome');
      chrome.addEventListener('pointerdown', (event) =>
        this.beginFloatingDrag(event, index, wrapper, chrome),
      );

      const title = document.createElement('div');
      title.classList.add('dock-floating__title');
      title.textContent = this.getFloatingWindowTitle(floating);
      chrome.appendChild(title);

      const stackNode: DockStackNode = {
        kind: 'stack',
        panes: [...floating.panes],
        titles: floating.titles ? { ...floating.titles } : undefined,
        activePane: floating.activePane,
      };

      const stack = this.renderStack(stackNode, [], { type: 'floating', index });
      stack.classList.add('dock-floating__stack');
      wrapper.appendChild(chrome);
      wrapper.appendChild(stack);
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

    this.floatingDragState = null;
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

  private startPointerTracking(): void {
    if (this.pointerTrackingActive) {
      return;
    }
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.pointerTrackingActive = true;
  }

  private stopPointerTrackingIfIdle(): void {
    if (this.pointerTrackingActive && !this.resizeState && !this.floatingDragState) {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      this.pointerTrackingActive = false;
    }
  }

  private getFloatingWindowTitle(floating: DockFloatingStackLayout): string {
    const fallback = 'Floating Pane';
    if (!floating || floating.panes.length === 0) {
      return fallback;
    }

    const active =
      floating.activePane && floating.panes.includes(floating.activePane)
        ? floating.activePane
        : floating.panes[0];

    return floating.titles?.[active] ?? active ?? fallback;
  }

  private updateFloatingWindowTitle(index: number): void {
    const floating = this.floatingLayouts[index];
    if (!floating) {
      return;
    }

    const selector = `.dock-floating[data-path="${this.formatPath({
      type: 'floating',
      index,
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

  private renderSplit(node: DockSplitNode, path: number[]): HTMLElement {
    const container = document.createElement('div');
    container.classList.add('dock-split');
    container.dataset['direction'] = node.direction;
    container.dataset['path'] = path.join('/');

    const sizes = Array.isArray(node.sizes) ? node.sizes : [];
    node.children.forEach((child, index) => {
      const childWrapper = document.createElement('div');
      childWrapper.classList.add('dock-split__child');
      childWrapper.dataset['index'] = String(index);

      const size = sizes[index];
      if (typeof size === 'number' && Number.isFinite(size)) {
        childWrapper.style.flex = `${Math.max(size, 0)} 1 0`;
      } else {
        childWrapper.style.flex = '1 1 0';
      }

      childWrapper.appendChild(this.renderNode(child, [...path, index]));
      container.appendChild(childWrapper);

      if (index < node.children.length - 1) {
        const divider = document.createElement('div');
        divider.classList.add('dock-split__divider');
        divider.setAttribute('role', 'separator');
        divider.tabIndex = 0;
        divider.addEventListener('pointerdown', (event) =>
          this.beginResize(event, container, path, index),
        );
        container.appendChild(divider);
      }
    });

    return container;
  }

  private renderStack(
    node: DockStackNode,
    path: number[],
    dockPath?: DockPath,
  ): HTMLElement {
    const stack = document.createElement('div');
    stack.classList.add('dock-stack');
    const location: DockPath =
      dockPath && dockPath.type === 'floating'
        ? { type: 'floating', index: dockPath.index }
        : { type: 'docked', segments: [...path] };
    stack.dataset['path'] = this.formatPath(location);

    const header = document.createElement('div');
    header.classList.add('dock-stack__header');
    header.setAttribute('role', 'tablist');
    const content = document.createElement('div');
    content.classList.add('dock-stack__content');

    const panes = Array.from(new Set(node.panes));
    if (panes.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('dock-stack__pane');
      empty.textContent = 'No panes configured';
      content.appendChild(empty);
      stack.append(header, content);
      return stack;
    }

    const activePane = panes.includes(node.activePane ?? '')
      ? node.activePane!
      : panes[0];

    const pathSlug = path.length ? path.join('-') : 'root';
    panes.forEach((paneName) => {
      const paneSlugRaw = paneName.replace(/[^a-zA-Z0-9_-]/g, '-');
      const paneSlug = paneSlugRaw.length > 0 ? paneSlugRaw : 'pane';
      const tabId = `${this.instanceId}-tab-${pathSlug}-${paneSlug}`;
      const panelId = `${this.instanceId}-panel-${pathSlug}-${paneSlug}`;

      const button = document.createElement('button');
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
      button.addEventListener('dragstart', (event) =>
        this.beginPaneDrag(event, this.clonePath(location), paneName),
      );
      button.addEventListener('dragend', () => this.endPaneDrag());
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

      const paneHost = document.createElement('div');
      paneHost.classList.add('dock-stack__pane');
      paneHost.dataset['pane'] = paneName;
      paneHost.id = panelId;
      paneHost.setAttribute('role', 'tabpanel');
      paneHost.setAttribute('aria-labelledby', tabId);
      if (paneName !== activePane) {
        paneHost.setAttribute('hidden', '');
      }

      const slotEl = document.createElement('slot');
      slotEl.name = paneName;
      paneHost.appendChild(slotEl);
      content.appendChild(paneHost);
    });

    stack.dataset['activePane'] = activePane;
    stack.append(header, content);
    return stack;
  }

  private beginResize(event: PointerEvent, container: HTMLElement, path: number[], index: number): void {
    if (!this.rootLayout) {
      return;
    }

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
      path: [...path],
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
      const splitNode = this.getDockedNode(state.path);
      if (!splitNode || splitNode.kind !== 'split') {
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

    this.stopPointerTrackingIfIdle();
  }

  private beginPaneDrag(event: DragEvent, path: DockPath, pane: string): void {
    if (!event.dataTransfer) {
      return;
    }

    this.dragState = {
      pane,
      sourcePath: this.clonePath(path),
    };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pane);
  }

  private endPaneDrag(): void {
    this.dragState = null;
    this.hideDropIndicator();
  }

  private onDragOver(event: DragEvent): void {
    if (!this.dragState) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const stack = this.findStackElement(event);
    if (!stack) {
      this.hideDropIndicator();
      return;
    }

    const zone = this.computeDropZone(stack, event);
    this.showDropIndicator(stack, zone);
  }

  private onDrop(event: DragEvent): void {
    if (!this.dragState) {
      return;
    }
    event.preventDefault();

    const stack = this.findStackElement(event);
    if (!stack) {
      this.hideDropIndicator();
      return;
    }

    const path = this.parsePath(stack.dataset['path']);
    const zone = this.computeDropZone(stack, event);
    this.handleDrop(path, zone);
    this.endPaneDrag();
  }

  private onDragLeave(event: DragEvent): void {
    const related = event.relatedTarget as Node | null;
    if (!related || !this.rootEl.contains(related)) {
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

    if (zone !== 'center' && target.context === 'floating') {
      return;
    }

    if (zone === 'center' && this.pathsEqual(sourcePath, targetPath)) {
      if (!source.node.panes.includes(pane)) {
        return;
      }
      this.reorderPaneInLocation(source, pane);
      this.render();
      this.dispatchLayoutChanged();
      return;
    }

    const stackEmptied = this.removePaneFromLocation(source, pane, true);

    if (zone === 'center') {
      this.addPaneToLocation(target, pane);
      this.setActivePaneForLocation(target, pane);
      if (stackEmptied) {
        this.cleanupLocation(source);
      }
      this.render();
      this.dispatchLayoutChanged();
      return;
    }

    if (!this.rootLayout) {
      this.rootLayout = {
        kind: 'stack',
        panes: [pane],
        activePane: pane,
      };
      if (stackEmptied) {
        this.cleanupLocation(source);
      }
      this.render();
      this.dispatchLayoutChanged();
      return;
    }

    if (target.context !== 'docked') {
      return;
    }

    const targetNode = target.node;

    const newStack: DockStackNode = {
      kind: 'stack',
      panes: [pane],
      activePane: pane,
    };

    const orientation = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
    const placeBefore = zone === 'left' || zone === 'top';

    const parentInfo = this.findParentSplit(this.rootLayout, targetNode);

    if (parentInfo && parentInfo.parent.direction === orientation) {
      const insertIndex = placeBefore ? parentInfo.index : parentInfo.index + 1;
      parentInfo.parent.children.splice(insertIndex, 0, newStack);
      parentInfo.parent.sizes = this.insertWeight(
        parentInfo.parent.sizes,
        insertIndex,
        parentInfo.parent.children.length,
      );
    } else {
      const split: DockSplitNode = {
        kind: 'split',
        direction: orientation,
        children: placeBefore ? [newStack, targetNode] : [targetNode, newStack],
        sizes: [0.5, 0.5],
      };
      this.replaceNode(targetNode, split);
    }

    if (stackEmptied) {
      this.cleanupLocation(source);
    }

    this.render();
    this.dispatchLayoutChanged();
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

    this.cleanupEmptyStack(stack);
    return true;
  }

  private cleanupEmptyStack(stack: DockStackNode): void {
    if (stack.panes.length > 0) {
      return;
    }

    if (!this.containsNode(this.rootLayout, stack)) {
      return;
    }

    const parentInfo = this.findParentSplit(this.rootLayout, stack);
    if (!parentInfo) {
      if (this.rootLayout === stack) {
        this.rootLayout = null;
      }
      return;
    }

    const index = parentInfo.parent.children.indexOf(stack);
    if (index === -1) {
      return;
    }

    parentInfo.parent.children.splice(index, 1);
    if (Array.isArray(parentInfo.parent.sizes)) {
      parentInfo.parent.sizes.splice(index, 1);
    }

    this.normalizeSplitNode(parentInfo.parent);

    if (parentInfo.parent.children.length === 1) {
      this.promoteSingleChild(parentInfo.parent);
    }

    if (parentInfo.parent.children.length === 0) {
      this.removeEmptySplit(parentInfo.parent);
    }
  }

  private containsNode(node: DockLayoutNode | null, target: DockLayoutNode): boolean {
    if (!node) {
      return false;
    }

    if (node === target) {
      return true;
    }

    if (node.kind !== 'split') {
      return false;
    }

    for (const child of node.children) {
      if (this.containsNode(child, target)) {
        return true;
      }
    }

    return false;
  }

  private promoteSingleChild(split: DockSplitNode): void {
    const child = split.children[0];
    const parentInfo = this.findParentSplit(this.rootLayout, split);
    if (!parentInfo) {
      this.rootLayout = child;
      return;
    }

    parentInfo.parent.children[parentInfo.index] = child;
    this.normalizeSplitNode(parentInfo.parent);
  }

  private removeEmptySplit(split: DockSplitNode): void {
    const parentInfo = this.findParentSplit(this.rootLayout, split);
    if (!parentInfo) {
      this.rootLayout = null;
      return;
    }

    parentInfo.parent.children.splice(parentInfo.index, 1);
    if (Array.isArray(parentInfo.parent.sizes)) {
      parentInfo.parent.sizes.splice(parentInfo.index, 1);
    }
    this.normalizeSplitNode(parentInfo.parent);
  }

  private replaceNode(target: DockLayoutNode, replacement: DockLayoutNode): void {
    if (!this.rootLayout) {
      this.rootLayout = replacement;
      return;
    }

    if (this.rootLayout === target) {
      this.rootLayout = replacement;
      return;
    }

    const parentInfo = this.findParentSplit(this.rootLayout, target);
    if (!parentInfo) {
      return;
    }

    parentInfo.parent.children[parentInfo.index] = replacement;
    this.normalizeSplitNode(parentInfo.parent);
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

  private computeDropZone(stack: HTMLElement, event: DragEvent): DropZone {
    const rect = stack.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const horizontalRatio = x / rect.width;
    const verticalRatio = y / rect.height;
    const threshold = 0.25;

    if (horizontalRatio < threshold) {
      return 'left';
    }
    if (horizontalRatio > 1 - threshold) {
      return 'right';
    }
    if (verticalRatio < threshold) {
      return 'top';
    }
    if (verticalRatio > 1 - threshold) {
      return 'bottom';
    }
    return 'center';
  }

  private showDropIndicator(stack: HTMLElement, zone: DropZone): void {
    const rect = stack.getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    const indicator = this.dropIndicator;

    const path = this.parsePath(stack.dataset['path']);
    let overlayZ = 100;
    if (path && path.type === 'floating') {
      overlayZ = this.getFloatingPaneZIndex(path.index) + 100;
    }
    indicator.style.zIndex = String(overlayZ);

    let left = rect.left - hostRect.left;
    let top = rect.top - hostRect.top;
    let width = rect.width;
    let height = rect.height;

    const portion = 0.5;

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
  }

  private hideDropIndicator(): void {
    this.dropIndicator.dataset['visible'] = 'false';
  }

  private findStackElement(event: DragEvent): HTMLElement | null {
    const path = event.composedPath();
    for (const target of path) {
      if (target instanceof HTMLElement && target.classList.contains('dock-stack')) {
        return target;
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
      this.updateFloatingWindowTitle(path.index);
    }
    this.dispatchLayoutChanged();
  }

  private getDockedNode(path: number[]): DockLayoutNode | null {
    if (!this.rootLayout) {
      return null;
    }
    let current: DockLayoutNode | null = this.rootLayout;
    if (path.length === 0) {
      return current;
    }

    for (const index of path) {
      if (!current || current.kind !== 'split') {
        return null;
      }
      current = current.children[index] ?? null;
    }

    return current;
  }

  private formatPath(path: DockPath): string {
    if (path.type === 'floating') {
      return `f:${path.index}`;
    }
    const suffix = path.segments.join('/');
    return suffix.length > 0 ? `d:${suffix}` : 'd:';
  }

  private clonePath(path: DockPath): DockPath {
    if (path.type === 'floating') {
      return { type: 'floating', index: path.index };
    }
    return { type: 'docked', segments: [...path.segments] };
  }

  private parsePath(path: string | null | undefined): DockPath | null {
    if (!path) {
      return null;
    }

    if (path.startsWith('f:')) {
      const index = Number.parseInt(path.slice(2), 10);
      return Number.isFinite(index) ? { type: 'floating', index } : null;
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
      return a.index === other.index;
    }

    const other = b as Extract<DockPath, { type: 'docked' }>;
    if (a.segments.length !== other.segments.length) {
      return false;
    }

    return a.segments.every((value, index) => value === other.segments[index]);
  }

  private resolveStackLocation(path: DockPath): ResolvedLocation | null {
    if (path.type === 'floating') {
      const node = this.floatingLayouts[path.index];
      if (!node) {
        return null;
      }
      return { context: 'floating', index: path.index, node };
    }

    const node = this.getDockedNode(path.segments);
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

    return this.removePaneFromFloating(location.index, pane, skipCleanup);
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
  }

  private cleanupLocation(location: ResolvedLocation): void {
    if (location.context === 'docked') {
      this.cleanupEmptyStack(location.node);
    } else {
      this.removeFloatingAt(location.index);
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
  }

  private removeFloatingAt(index: number): void {
    if (index < 0 || index >= this.floatingLayouts.length) {
      return;
    }
    this.floatingLayouts.splice(index, 1);
  }

  private removePaneFromFloating(
    index: number,
    pane: string,
    skipCleanup = false,
  ): boolean {
    const floating = this.floatingLayouts[index];
    if (!floating) {
      return false;
    }

    floating.panes = floating.panes.filter((p) => p !== pane);
    if (!floating.panes.includes(floating.activePane ?? '')) {
      if (floating.panes.length > 0) {
        floating.activePane = floating.panes[0];
      } else {
        delete floating.activePane;
      }
    }

    if (floating.panes.length > 0) {
      return false;
    }

    if (skipCleanup) {
      return true;
    }

    this.removeFloatingAt(index);
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

if (!customElements.get(tagName)) {
  customElements.define(tagName, MintDockManagerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mint-dock-manager': MintDockManagerElement;
  }
}
