import { LitElement, html, type TemplateResult } from 'lit';
import { SplitterStateManager } from '../state';
import { InputHandler, type ResizeKey } from '../input';
import { ResizeManager } from '../managers';
import { splitterStyles } from '../styles';
import type { Direction, Point } from '../types';

export interface SplitterResizeEventDetail {
  sizes: number[];
  orientation: Direction;
}

let splitterInstanceCounter = 0;

export class MpSplitter extends LitElement {
  static override styles = [splitterStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'orientation',
      'min-panel-size',
      'touch-mode',
    ];
  }

  private stateManager: SplitterStateManager;
  private inputHandler: InputHandler;
  private resizeManager: ResizeManager;

  private container: HTMLDivElement | null = null;
  private panelWrappers: HTMLDivElement[] = [];
  private dividers: HTMLDivElement[] = [];
  private slotElement: HTMLSlotElement | null = null;

  private mutationObserver: MutationObserver | null = null;
  private containerResizeObserver: ResizeObserver | null = null;
  private unsubscribeState: (() => void) | null = null;

  private readonly instanceId = `mp-splitter-${++splitterInstanceCounter}`;

  constructor() {
    super();

    this.stateManager = new SplitterStateManager();
    this.resizeManager = new ResizeManager();

    this.inputHandler = new InputHandler({
      onResizeStart: this.handleResizeStart.bind(this),
      onResizeMove: this.handleResizeMove.bind(this),
      onResizeEnd: this.handleResizeEnd.bind(this),
      onResizeKey: this.handleResizeKey.bind(this),
    });
  }

  override render(): TemplateResult {
    return html`
      <div class="splitter-container"></div>
      <slot></slot>
    `;
  }

  protected override firstUpdated(): void {
    this.container = this.shadowRoot!.querySelector('.splitter-container') as HTMLDivElement;
    this.container.classList.add(this.orientation);

    this.slotElement = this.shadowRoot!.querySelector('slot') as HTMLSlotElement;
    // Hide the default slot - we'll project content ourselves via named slots.
    this.slotElement.style.display = 'none';
    this.slotElement.addEventListener('slotchange', () => {
      this.updatePanelsFromSlot();
    });

    this.setupMutationObserver();
    this.subscribeToState();
    this.setupContainerResizeObserver();

    // Initial setup after first render
    requestAnimationFrame(() => {
      this.updatePanelsFromSlot();
    });
  }

  override disconnectedCallback(): void {
    this.inputHandler.dispose();

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.containerResizeObserver) {
      this.containerResizeObserver.disconnect();
      this.containerResizeObserver = null;
    }

    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }
    super.disconnectedCallback();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
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
      this.updateDividerAriaValues();
    });
  }

  /**
   * Mirror current panel sizes to each divider's aria-valuenow / valuemin /
   * valuemax as percent of container. Per §10 Q3 of the WC ARIA PRD: percent
   * is more intuitive for SR users than pixels.
   *
   * Per-divider math: divider i sits between panels[i] and panels[i+1] and
   * "owns" the size of panels[i]. valuemin = minPanelSize as % of container;
   * valuemax = (panels[i].size + panels[i+1].size - minPanelSize) as %.
   */
  private updateDividerAriaValues(): void {
    if (this.dividers.length === 0 || !this.container) return;
    const state = this.stateManager.getState();
    const sizes = state.previewSizes ?? state.panelSizes;
    if (sizes.length !== this.panelWrappers.length || sizes.length === 0) return;
    const rect = this.container.getBoundingClientRect();
    const containerSize = this.orientation === 'horizontal' ? rect.width : rect.height;
    if (containerSize <= 0) return;
    const minPanelSize = this.resizeManager.getMinPanelSize();

    this.dividers.forEach((divider, i) => {
      const before = sizes[i];
      const after = sizes[i + 1];
      if (before === undefined || after === undefined) return;
      const valuenow = Math.round((before / containerSize) * 100);
      const valuemin = Math.round((minPanelSize / containerSize) * 100);
      const pairTotal = before + after;
      const valuemax = Math.round(((pairTotal - minPanelSize) / containerSize) * 100);
      divider.setAttribute('aria-valuenow', String(valuenow));
      divider.setAttribute('aria-valuemin', String(valuemin));
      divider.setAttribute('aria-valuemax', String(valuemax));
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
    const panelCount = children.length;
    const dividerAriaOrientation = this.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    children.forEach((child, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'panel-wrapper flex-grow';
      wrapper.id = `${this.instanceId}-panel-${index}`;

      // Create a named slot for this child
      const namedSlot = document.createElement('slot');
      const slotName = `panel-${index}`;
      namedSlot.name = slotName;
      child.slot = slotName;

      wrapper.appendChild(namedSlot);
      this.panelWrappers.push(wrapper);
      this.container!.appendChild(wrapper);

      // Add divider between panels
      if (index < panelCount - 1) {
        const divider = document.createElement('div');
        divider.className = 'divider';
        divider.setAttribute('role', 'separator');
        divider.setAttribute('aria-orientation', dividerAriaOrientation);
        divider.setAttribute('tabindex', '0');
        divider.setAttribute(
          'aria-controls',
          `${this.instanceId}-panel-${index} ${this.instanceId}-panel-${index + 1}`,
        );
        divider.setAttribute(
          'aria-label',
          `Resize between panel ${index + 1} and panel ${index + 2}`,
        );
        this.inputHandler.attachDividerListeners(divider, index);
        this.dividers.push(divider);
        this.container!.appendChild(divider);
      }
    });

    // Re-apply previously-stored sizes when the panel count still matches.
    // Two cases where this matters:
    //   1. setPanelSizes() was called before firstUpdated's raf populated
    //      the wrappers (e.g., the dock schedules its own raf inside
    //      renderSplit) — without this, the early call is silently dropped.
    //   2. Slot children change after a drag (e.g., layout re-render) — the
    //      wrappers get recreated with `flex: 1 1 0` (equal sizes) and would
    //      otherwise discard the user's drag result.
    const storedSizes = this.stateManager.getState().panelSizes;
    if (storedSizes.length > 0 && storedSizes.length === this.panelWrappers.length) {
      this.applyPanelSizes(storedSizes);
      // Consumer-supplied sizes (e.g., from the dock's renderSplit) often
      // sum to the full container size because the consumer doesn't know
      // mp-splitter's internal divider widths. Defer one raf so dividers
      // have laid out, then rescale stored sizes against the actual panel
      // space (container - dividers). Without this step ResizeObserver
      // alone can't catch the discrepancy because the container size
      // hasn't changed — only the panel/divider split inside it has.
      requestAnimationFrame(() => this.handleContainerResize());
      return;
    }

    // No stored sizes (or count mismatch) — pin from the measured layout
    // once the browser has run layout for the new wrappers. A nested raf
    // is needed because the wrappers were created in this very turn and
    // their getBoundingClientRect would return 0 if read synchronously.
    requestAnimationFrame(() => {
      const current = this.stateManager.getState().panelSizes;
      if (current.length === this.panelWrappers.length && current.length > 0) {
        // A consumer (e.g., the dock) called setPanelSizes() between our
        // raf scheduling and execution. Honour their values instead of
        // overwriting with measurements.
        this.applyPanelSizes(current);
        return;
      }
      this.pinSizesFromCurrentLayout();
    });
  }

  /**
   * Read each panel-wrapper's measured pixel size and persist it as the
   * authoritative panel size. After this runs, every wrapper carries an
   * inline `width` (or `height`) — content intrinsic size cannot leak into
   * the parent flex container, so a nested splitter's drag does not shift
   * the parent's layout.
   */
  private pinSizesFromCurrentLayout(): void {
    if (this.panelWrappers.length === 0) return;
    const sizeProperty = this.orientation === 'horizontal' ? 'width' : 'height';
    const measured = this.panelWrappers.map(
      (wrapper) => wrapper.getBoundingClientRect()[sizeProperty]
    );
    // Layout hasn't run yet for these wrappers — bail rather than write
    // 0 px sizes that would collapse every panel.
    if (measured.every((v) => v <= 0)) return;
    this.applyPanelSizes(measured);
    this.stateManager.setPanelSizes(measured);
  }

  private setupContainerResizeObserver(): void {
    if (!this.container || typeof ResizeObserver === 'undefined') return;
    this.containerResizeObserver = new ResizeObserver(() => {
      this.handleContainerResize();
    });
    this.containerResizeObserver.observe(this.container);
  }

  /**
   * When the splitter's container resizes (window resize, parent splitter
   * pinning its sizes, etc.), scale every panel-wrapper proportionally so
   * the existing ratios are preserved. Without this we'd be stuck with the
   * original pixel sizes when the surrounding viewport changes — what
   * `flex-basis: 0` gave master "for free".
   */
  private handleContainerResize(): void {
    if (!this.container || this.panelWrappers.length === 0) return;
    // applyPanelSizes runs continuously during a drag; its writes can fire
    // ResizeObserver via subpixel rounding. The drag math already keeps
    // panels summing to the container — don't fight it.
    if (this.stateManager.isResizing()) return;

    const stored = this.stateManager.getState().panelSizes;
    if (stored.length === 0 || stored.length !== this.panelWrappers.length) return;

    const rect = this.container.getBoundingClientRect();
    const containerSize = this.orientation === 'horizontal' ? rect.width : rect.height;
    if (containerSize <= 0) return;

    const dividerProperty = this.orientation === 'horizontal' ? 'width' : 'height';
    const dividerTotal = this.dividers.reduce(
      (sum, divider) => sum + divider.getBoundingClientRect()[dividerProperty],
      0
    );
    // Adjacent panel-wrappers carry negative margins (`margin-left` /
    // `margin-right` of `-thumb-margin`) so they visually overlap the
    // divider's transparent borders. In the flex calculation those negative
    // margins reduce a divider's effective width contribution; if we ignore
    // them we under-target by 2 * (N-1) * thumb px and the container gets
    // a gap at the trailing edge.
    const startMarginProp = this.orientation === 'horizontal' ? 'marginLeft' : 'marginTop';
    const endMarginProp = this.orientation === 'horizontal' ? 'marginRight' : 'marginBottom';
    const marginTotal = this.panelWrappers.reduce((sum, wrapper) => {
      const cs = getComputedStyle(wrapper);
      return sum + parseFloat(cs[startMarginProp]) + parseFloat(cs[endMarginProp]);
    }, 0);
    const targetPanelTotal = Math.max(0, containerSize - dividerTotal - marginTotal);
    const previousPanelTotal = stored.reduce((a, b) => a + b, 0);
    if (previousPanelTotal <= 0) return;

    // Below 1 px we'd be amplifying our own subpixel writes. Skip.
    if (Math.abs(targetPanelTotal - previousPanelTotal) < 1) return;

    const scale = targetPanelTotal / previousPanelTotal;
    const newSizes = stored.map((s) => s * scale);
    this.applyPanelSizes(newSizes);
    this.stateManager.setPanelSizes(newSizes);
    this.updateDividerAriaValues();
  }

  private updateContainerOrientation(): void {
    if (!this.container) return;

    this.container.className = `splitter-container ${this.orientation}`;

    const dividerAriaOrientation = this.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    this.dividers.forEach((divider) => {
      divider.setAttribute('aria-orientation', dividerAriaOrientation);
    });
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

  /**
   * Keyboard-driven resize on a focused divider. ArrowKeys ±10% (Shift = ±1%)
   * along the splitter's axis; Home/End shrink/grow panelBefore to its limit.
   * Fires resize-start → resize-end with the new sizes so consumers don't
   * need to special-case keyboard vs. drag.
   */
  private handleResizeKey(
    key: ResizeKey,
    fine: boolean,
    dividerIndex: number,
    dividerElement: HTMLElement,
  ): void {
    if (!this.container) return;
    if (this.panelWrappers.length === 0) return;

    const sizes = [...this.stateManager.getState().panelSizes];
    if (sizes.length !== this.panelWrappers.length) return;

    const before = sizes[dividerIndex];
    const after = sizes[dividerIndex + 1];
    if (before === undefined || after === undefined) return;

    const rect = this.container.getBoundingClientRect();
    const containerSize = this.orientation === 'horizontal' ? rect.width : rect.height;
    if (containerSize <= 0) return;
    const minPanelSize = this.resizeManager.getMinPanelSize();

    const isHorizontal = this.orientation === 'horizontal';
    const positive = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const negative = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    let direction: 1 | -1 | 0 = 0;
    if (key === positive) direction = 1;
    else if (key === negative) direction = -1;

    let newBefore: number;
    let newAfter: number;
    if (key === 'Home') {
      newBefore = minPanelSize;
      newAfter = before + after - minPanelSize;
    } else if (key === 'End') {
      newBefore = before + after - minPanelSize;
      newAfter = minPanelSize;
    } else if (direction !== 0) {
      const stepPercent = fine ? 1 : 10;
      const deltaPx = (stepPercent / 100) * containerSize * direction;
      newBefore = before + deltaPx;
      newAfter = after - deltaPx;
      // Clamp to min on both sides — symmetric with the pointer path in
      // ResizeManager.calculatePreviewSizes.
      if (newBefore < minPanelSize) {
        newBefore = minPanelSize;
        newAfter = before + after - minPanelSize;
      } else if (newAfter < minPanelSize) {
        newAfter = minPanelSize;
        newBefore = before + after - minPanelSize;
      }
    } else {
      // Off-axis arrow — silently ignored.
      return;
    }

    if (newBefore === before && newAfter === after) return;

    sizes[dividerIndex] = newBefore;
    sizes[dividerIndex + 1] = newAfter;

    this.applyPanelSizes(sizes);
    this.stateManager.setPanelSizes(sizes);
    this.updateDividerAriaValues();

    dividerElement.classList.add('active');
    queueMicrotask(() => dividerElement.classList.remove('active'));

    this.dispatchEvent(
      new CustomEvent<SplitterResizeEventDetail>('resize-end', {
        bubbles: true,
        detail: { sizes, orientation: this.orientation },
      }),
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
