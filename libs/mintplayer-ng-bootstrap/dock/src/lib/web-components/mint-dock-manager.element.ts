
import { DockLayoutNode, DockSplitNode, DockStackNode, DockLayoutSnapshot } from '../types/dock-layout';

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
      display: flex;
      width: 100%;
      height: 100%;
      position: relative;
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
      z-index: 1;
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
  <div class="dock-root"></div>
  <div class="dock-drop-indicator"></div>
`;

export class MintDockManagerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['layout'];
  }

  private readonly rootEl: HTMLElement;
  private readonly dropIndicator: HTMLElement;
  private _layout: DockLayoutNode | null = null;
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
    sourcePath: number[];
  } | null = null;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));
    const root = shadowRoot.querySelector<HTMLElement>('.dock-root');
    if (!root) {
      throw new Error('mint-dock-manager template is missing the root element.');
    }

    const indicator = shadowRoot.querySelector<HTMLElement>('.dock-drop-indicator');
    if (!indicator) {
      throw new Error('mint-dock-manager template is missing the drop indicator element.');
    }

    this.rootEl = root;
    this.dropIndicator = indicator;
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
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'layout') {
      this.layout = newValue ? this.parseLayout(newValue) : null;
    }
  }

  get layout(): DockLayoutNode | null {
    return this._layout ? this.cloneLayout(this._layout) : null;
  }

  set layout(value: DockLayoutNode | null) {
    this._layout = value ? this.cloneLayout(value) : null;
    this.render();
  }

  get snapshot(): DockLayoutSnapshot {
    return {
      root: this._layout ? this.cloneLayout(this._layout) : null,
    };
  }

  toJSON(): DockLayoutSnapshot {
    return this.snapshot;
  }

  private parseLayout(value: string): DockLayoutNode | null {
    try {
      const parsed = JSON.parse(value) as DockLayoutNode | null;
      if (!parsed) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('mint-dock-manager: failed to parse layout attribute', err);
      return null;
    }
  }

  private render(): void {
    this.rootEl.innerHTML = '';
    this.hideDropIndicator();
    if (!this._layout) {
      return;
    }
    const fragment = this.renderNode(this._layout, []);
    this.rootEl.appendChild(fragment);
  }

  private renderNode(node: DockLayoutNode, path: number[]): HTMLElement {
    if (node.kind === 'split') {
      return this.renderSplit(node, path);
    }

    return this.renderStack(node, path);
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

  private renderStack(node: DockStackNode, path: number[]): HTMLElement {
    const stack = document.createElement('div');
    stack.classList.add('dock-stack');
    stack.dataset['path'] = path.join('/');

    const header = document.createElement('div');
    header.classList.add('dock-stack__header');
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

    panes.forEach((paneName) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('dock-tab');
      button.dataset['pane'] = paneName;
      button.textContent = node.titles?.[paneName] ?? paneName;
      if (paneName === activePane) {
        button.classList.add('dock-tab--active');
      }
      button.draggable = true;
      button.addEventListener('dragstart', (event) =>
        this.beginPaneDrag(event, path, paneName),
      );
      button.addEventListener('dragend', () => this.endPaneDrag());
      button.addEventListener('click', () => {
        this.activatePane(stack, paneName, path);
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
    if (!this._layout) {
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

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) {
      return;
    }

    const state = this.resizeState;
    const splitNode = this.getNode(state.path);
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

  private onPointerUp(event: PointerEvent): void {
    if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) {
      return;
    }

    const divider = this.resizeState.divider;
    divider.dataset['resizing'] = 'false';
    divider.releasePointerCapture(this.resizeState.pointerId);
    this.resizeState = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  private beginPaneDrag(event: DragEvent, path: number[], pane: string): void {
    if (!event.dataTransfer) {
      return;
    }

    this.dragState = {
      pane,
      sourcePath: [...path],
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

  private handleDrop(targetPath: number[], zone: DropZone): void {
    if (!this._layout || !this.dragState) {
      return;
    }

    const targetNode = this.getNode(targetPath);
    if (!targetNode || targetNode.kind !== 'stack') {
      return;
    }

    const { pane, sourcePath } = this.dragState;
    const sourceNode = this.getNode(sourcePath);
    if (!sourceNode || sourceNode.kind !== 'stack') {
      return;
    }

    if (zone === 'center' && this.pathsEqual(sourcePath, targetPath)) {
      if (!sourceNode.panes.includes(pane)) {
        return;
      }
      sourceNode.panes = sourceNode.panes.filter((p) => p !== pane);
      sourceNode.panes.push(pane);
      sourceNode.activePane = pane;
      this.render();
      this.dispatchLayoutChanged();
      return;
    }

    const stackEmptied = this.removePaneFromStack(sourceNode, pane, true);

    if (!this._layout) {
      this._layout = {
        kind: 'stack',
        panes: [pane],
        activePane: pane,
      };
      if (stackEmptied) {
        this.cleanupEmptyStack(sourceNode);
      }
      this.render();
      this.dispatchLayoutChanged();
      return;
    }

    if (zone === 'center') {
      if (!targetNode.panes.includes(pane)) {
        targetNode.panes.push(pane);
      }
      targetNode.activePane = pane;
      if (stackEmptied) {
        this.cleanupEmptyStack(sourceNode);
      }
      this.render();
      this.dispatchLayoutChanged();
      return;
    }

    const newStack: DockStackNode = {
      kind: 'stack',
      panes: [pane],
      activePane: pane,
    };

    const orientation = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
    const placeBefore = zone === 'left' || zone === 'top';

    const parentInfo = this.findParentSplit(this._layout, targetNode);

    if (parentInfo && parentInfo.parent.direction === orientation) {
      const insertIndex = placeBefore ? parentInfo.index : parentInfo.index + 1;
      parentInfo.parent.children.splice(insertIndex, 0, newStack);
      parentInfo.parent.sizes = this.insertWeight(parentInfo.parent.sizes, insertIndex, parentInfo.parent.children.length);
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
      this.cleanupEmptyStack(sourceNode);
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

    if (!this.containsNode(this._layout, stack)) {
      return;
    }

    const parentInfo = this.findParentSplit(this._layout, stack);
    if (!parentInfo) {
      if (this._layout === stack) {
        this._layout = null;
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
    const parentInfo = this.findParentSplit(this._layout, split);
    if (!parentInfo) {
      this._layout = child;
      return;
    }

    parentInfo.parent.children[parentInfo.index] = child;
    this.normalizeSplitNode(parentInfo.parent);
  }

  private removeEmptySplit(split: DockSplitNode): void {
    const parentInfo = this.findParentSplit(this._layout, split);
    if (!parentInfo) {
      this._layout = null;
      return;
    }

    parentInfo.parent.children.splice(parentInfo.index, 1);
    if (Array.isArray(parentInfo.parent.sizes)) {
      parentInfo.parent.sizes.splice(parentInfo.index, 1);
    }
    this.normalizeSplitNode(parentInfo.parent);
  }

  private replaceNode(target: DockLayoutNode, replacement: DockLayoutNode): void {
    if (!this._layout) {
      this._layout = replacement;
      return;
    }

    if (this._layout === target) {
      this._layout = replacement;
      return;
    }

    const parentInfo = this.findParentSplit(this._layout, target);
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

  private activatePane(stack: HTMLElement, paneName: string, path: number[]): void {
    stack.dataset['activePane'] = paneName;

    const headerButtons = stack.querySelectorAll<HTMLButtonElement>('.dock-tab');
    headerButtons.forEach((button) => {
      button.classList.toggle('dock-tab--active', button.dataset['pane'] === paneName);
    });

    const panes = stack.querySelectorAll<HTMLElement>('.dock-stack__pane');
    panes.forEach((pane) => {
      if (pane.dataset['pane'] === paneName) {
        pane.removeAttribute('hidden');
      } else {
        pane.setAttribute('hidden', '');
      }
    });

    const node = this.getNode(path);
    if (node && node.kind === 'stack') {
      node.activePane = paneName;
      this.dispatchLayoutChanged();
    }
  }

  private getNode(path: number[]): DockLayoutNode | null {
    if (!this._layout) {
      return null;
    }
    let current: DockLayoutNode | null = this._layout;
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

  private parsePath(path: string | null | undefined): number[] {
    if (!path) {
      return [];
    }

    return path
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => Number.parseInt(segment, 10))
      .filter((value) => Number.isFinite(value));
  }

  private pathsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => value === b[index]);
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

  private cloneLayout(layout: DockLayoutNode): DockLayoutNode;
  private cloneLayout(layout: DockLayoutNode | null): DockLayoutNode | null;
  private cloneLayout(layout: DockLayoutNode | null): DockLayoutNode | null {
    if (!layout) {
      return null;
    }

    return JSON.parse(JSON.stringify(layout)) as DockLayoutNode;
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
