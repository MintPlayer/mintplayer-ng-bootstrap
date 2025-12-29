import { SplitterStateManager } from '../state';
import { InputHandler } from '../input';
import { ResizeManager } from '../managers';
import { splitterStyles } from '../styles';
import type { Direction, Point } from '../types';

export interface SplitterResizeEventDetail {
  sizes: number[];
  orientation: Direction;
}

export class MpSplitter extends HTMLElement {
  private shadow: ShadowRoot;
  private stateManager: SplitterStateManager;
  private inputHandler: InputHandler;
  private resizeManager: ResizeManager;

  private container: HTMLDivElement | null = null;
  private panelWrappers: HTMLDivElement[] = [];
  private dividers: HTMLDivElement[] = [];
  private slotElement: HTMLSlotElement | null = null;

  private mutationObserver: MutationObserver | null = null;
  private unsubscribeState: (() => void) | null = null;

  static observedAttributes = ['orientation', 'min-panel-size', 'touch-mode'];

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.stateManager = new SplitterStateManager();
    this.resizeManager = new ResizeManager();

    this.inputHandler = new InputHandler({
      onResizeStart: this.handleResizeStart.bind(this),
      onResizeMove: this.handleResizeMove.bind(this),
      onResizeEnd: this.handleResizeEnd.bind(this),
    });
  }

  connectedCallback(): void {
    this.render();
    this.setupMutationObserver();
    this.subscribeToState();

    // Initial setup after first render
    requestAnimationFrame(() => {
      this.updatePanelsFromSlot();
    });
  }

  disconnectedCallback(): void {
    this.inputHandler.dispose();

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue) return;

    switch (name) {
      case 'orientation':
        this.stateManager.setOrientation(
          (newValue as Direction) || 'horizontal'
        );
        this.updateContainerOrientation();
        break;
      case 'min-panel-size':
        const parsedSize = newValue ? parseInt(newValue, 10) : 50;
        this.resizeManager.setMinPanelSize(!isNaN(parsedSize) ? parsedSize : 50);
        break;
      case 'touch-mode':
        // Handled by CSS via :host([touch-mode])
        break;
    }
  }

  // Public API
  get orientation(): Direction {
    return (this.getAttribute('orientation') as Direction) || 'horizontal';
  }

  set orientation(value: Direction) {
    this.setAttribute('orientation', value);
  }

  get minPanelSize(): number {
    const attr = this.getAttribute('min-panel-size');
    return attr ? parseInt(attr, 10) : 50;
  }

  set minPanelSize(value: number) {
    this.setAttribute('min-panel-size', String(value));
  }

  get touchMode(): boolean {
    return this.hasAttribute('touch-mode');
  }

  set touchMode(value: boolean) {
    if (value) {
      this.setAttribute('touch-mode', '');
    } else {
      this.removeAttribute('touch-mode');
    }
  }

  getPanelSizes(): number[] {
    return this.stateManager.getState().panelSizes;
  }

  setPanelSizes(sizes: number[]): void {
    this.applyPanelSizes(sizes);
    this.stateManager.setPanelSizes(sizes);
  }

  // Private methods
  private render(): void {
    const style = document.createElement('style');
    style.textContent = splitterStyles;

    this.container = document.createElement('div');
    this.container.className = `splitter-container ${this.orientation}`;

    this.slotElement = document.createElement('slot');

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);
    this.shadow.appendChild(this.slotElement);

    // Hide the default slot - we'll project content ourselves
    this.slotElement.style.display = 'none';

    this.slotElement.addEventListener('slotchange', () => {
      this.updatePanelsFromSlot();
    });
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver(() => {
      this.updatePanelsFromSlot();
    });

    this.mutationObserver.observe(this, {
      childList: true,
      subtree: false,
    });
  }

  private subscribeToState(): void {
    this.unsubscribeState = this.stateManager.subscribe((state) => {
      if (state.resizeOperation) {
        this.setAttribute('resizing', '');
      } else {
        this.removeAttribute('resizing');
      }
    });
  }

  private updatePanelsFromSlot(): void {
    if (!this.container) return;

    const children = Array.from(this.children).filter(
      (child) => child instanceof HTMLElement
    ) as HTMLElement[];

    if (children.length === 0) return;

    // Clear existing wrappers and dividers
    this.container.innerHTML = '';
    this.panelWrappers = [];
    this.dividers = [];

    // Create panel wrappers with slots for each child
    children.forEach((child, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'panel-wrapper flex-grow';

      // Create a named slot for this child
      const namedSlot = document.createElement('slot');
      const slotName = `panel-${index}`;
      namedSlot.name = slotName;
      child.slot = slotName;

      wrapper.appendChild(namedSlot);
      this.panelWrappers.push(wrapper);
      this.container!.appendChild(wrapper);

      // Add divider between panels
      if (index < children.length - 1) {
        const divider = document.createElement('div');
        divider.className = 'divider';
        this.inputHandler.attachDividerListeners(divider, index);
        this.dividers.push(divider);
        this.container!.appendChild(divider);
      }
    });
  }

  private updateContainerOrientation(): void {
    if (!this.container) return;

    this.container.className = `splitter-container ${this.orientation}`;
  }

  private handleResizeStart(
    event: { point: Point; originalEvent: MouseEvent | TouchEvent },
    dividerIndex: number,
    dividerElement: HTMLElement
  ): void {
    const sizes = this.resizeManager.computePanelSizes(
      this.panelWrappers,
      this.orientation
    );

    const operation = this.resizeManager.createResizeOperation(
      event.point,
      sizes,
      dividerIndex,
      dividerElement
    );

    this.stateManager.startResize(operation);
    dividerElement.classList.add('active');

    this.dispatchEvent(
      new CustomEvent<SplitterResizeEventDetail>('resize-start', {
        bubbles: true,
        detail: {
          sizes,
          orientation: this.orientation,
        },
      })
    );
  }

  private handleResizeMove(event: {
    point: Point;
    originalEvent: MouseEvent | TouchEvent;
  }): void {
    const state = this.stateManager.getState();
    if (!state.resizeOperation) return;

    const previewSizes = this.resizeManager.calculatePreviewSizes(
      state.resizeOperation,
      event.point,
      this.orientation
    );

    this.stateManager.updateResize(previewSizes);
    this.applyPanelSizes(previewSizes);

    this.dispatchEvent(
      new CustomEvent<SplitterResizeEventDetail>('resizing', {
        bubbles: true,
        detail: {
          sizes: previewSizes,
          orientation: this.orientation,
        },
      })
    );
  }

  private handleResizeEnd(_event: {
    point: Point;
    originalEvent: MouseEvent | TouchEvent;
  }): void {
    const state = this.stateManager.getState();
    if (!state.resizeOperation) return;

    const finalSizes = state.previewSizes || state.resizeOperation.sizes;

    if (state.resizeOperation.dividerElement) {
      state.resizeOperation.dividerElement.classList.remove('active');
    }

    this.stateManager.endResize(finalSizes);

    this.dispatchEvent(
      new CustomEvent<SplitterResizeEventDetail>('resize-end', {
        bubbles: true,
        detail: {
          sizes: finalSizes,
          orientation: this.orientation,
        },
      })
    );
  }

  private applyPanelSizes(sizes: number[]): void {
    const sizeProperty = this.orientation === 'horizontal' ? 'width' : 'height';
    const resetProperty =
      this.orientation === 'horizontal' ? 'height' : 'width';

    this.panelWrappers.forEach((wrapper, index) => {
      if (sizes[index] !== undefined) {
        wrapper.style[sizeProperty] = `${sizes[index]}px`;
        wrapper.style[resetProperty] = '';
        wrapper.classList.remove('flex-grow');
      }
    });
  }
}

// Auto-register the custom element
if (
  typeof customElements !== 'undefined' &&
  !customElements.get('mp-splitter')
) {
  customElements.define('mp-splitter', MpSplitter);
}
