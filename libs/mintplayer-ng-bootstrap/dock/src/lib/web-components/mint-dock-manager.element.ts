
import { LitElement, type TemplateResult } from 'lit';
// Side-effect import: registers <mp-tab-control> + <mp-tab-page> custom elements.
// Each dock stack is rendered as <mp-tab-control>, so the dock depends on this
// lib being loaded before any layout is rendered.
import '@mintplayer/tab-control-wc';
// Side-effect import: registers <mp-splitter>. Each DockSplitNode is rendered
// as a nested <mp-splitter>, so this lib must load before any layout renders.
import '@mintplayer/splitter';
import {
  DockFloatingStackLayout,
  DockLayout,
  DockLayoutNode,
  DockLayoutSnapshot,
  DockSplitNode,
  DockStackNode,
} from '../types/dock-layout';
import { template, styles } from './mint-dock-manager.element.template';

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

export class MintDockManagerElement extends LitElement {
  static override styles = [styles];

  private static documentRef: Document | null =
    typeof document !== 'undefined' ? document : null;

  static configureDocument(documentRef: Document | null | undefined): void {
    if (documentRef) {
      MintDockManagerElement.documentRef = documentRef;
    }
  }

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'layout'];
  }

  private static instanceCounter = 0;

  private documentRef!: Document;
  private windowRef!: (Window & typeof globalThis) | null;
  private rootEl!: HTMLElement;
  private dockedEl!: HTMLElement;
  private floatingLayerEl!: HTMLElement;
  private dropIndicator!: HTMLElement;
  private dropJoystick!: HTMLElement;
  private dropJoystickButtons!: HTMLButtonElement[];
  private readonly instanceId: string;
  private dropJoystickTarget: HTMLElement | null = null;
  private rootLayout: DockLayoutNode | null = null;
  private floatingLayouts: DockFloatingStackLayout[] = [];
  private titles: Record<string, string> = {};
  private pendingTabDragMetrics:
    | {
        pointerOffsetX: number;
        pointerOffsetY: number;
        left: number;
        top: number;
        width: number;
        height: number;
        startClientX: number;
        startClientY: number;
      }
    | null = null;
  private dragState: {
    pane: string;
    sourcePath: DockPath;
    floatingIndex: number | null;
    pointerOffsetX: number;
    pointerOffsetY: number;
    dropHandled: boolean;
    // For tab reordering before converting to floating
    sourceStackEl?: HTMLElement | null;
    sourceHeaderBounds?: { left: number; top: number; right: number; bottom: number } | null;
    startClientX?: number;
    startClientY?: number;
    liveReorderIndex?: number;
    placeholderHeader?: HTMLElement | null;
    placeholderEl?: HTMLElement | null;
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
  private intersectionRaf: number | null = null;
  private intersectionHandles: Map<string, HTMLElement> = new Map();
  private cornerResizeState:
    | {
        pointerId: number;
        handle: HTMLElement;
        // All horizontal divider bars (belong to vertical splits)
        hs: Array<{
          path: DockPath;
          index: number;
          container: HTMLElement;
          beforeSize: number;
          afterSize: number;
          initialSizes: number[];
          startY: number;
        }>;
        // All vertical divider bars (belong to horizontal splits)
        vs: Array<{
          path: DockPath;
          index: number;
          container: HTMLElement;
          beforeSize: number;
          afterSize: number;
          initialSizes: number[];
          startX: number;
        }>;
      }
    | null = null;
  private pointerTrackingActive = false;
  private dragPointerTrackingActive = false;
  private lastDragPointerPosition: { x: number; y: number } | null = null;
  // Localized snapping while dragging an intersection handle
  private cornerSnapXTargets: number[] = [];
  private cornerSnapYTargets: number[] = [];
  // Debug: render snap markers while dragging
  private showSnapMarkers = false;

  private renderSnapMarkersForCorner(): void {
    if (!this.showSnapMarkers) return;
    const layer = this.shadowRoot?.querySelector<HTMLElement>('.dock-intersections-layer, .dock-intersection-layer');
    if (!layer) return;
    Array.from(layer.querySelectorAll('.dock-snap-marker')).forEach((el) => el.remove());
    if (!this.cornerResizeState) return;
    const rootRect = this.rootEl.getBoundingClientRect();
    // Compute representative center lines from the dividers being resized.
    // st.{hs,vs}[i].container is the <mp-splitter>; the divider lives in its
    // shadow at getSplitterDividers(splitter)[index].
    let centerX: number | null = null;
    let centerY: number | null = null;
    const st = this.cornerResizeState;
    if (st.vs.length > 0) {
      const v0 = st.vs[0];
      const vDiv = this.getSplitterDividers(v0.container)[v0.index];
      const vRect = vDiv?.getBoundingClientRect();
      if (vRect) centerX = vRect.left + vRect.width / 2 - rootRect.left;
    }
    if (st.hs.length > 0) {
      const h0 = st.hs[0];
      const hDiv = this.getSplitterDividers(h0.container)[h0.index];
      const hRect = hDiv?.getBoundingClientRect();
      if (hRect) centerY = hRect.top + hRect.height / 2 - rootRect.top;
    }
    if (centerY != null) {
      this.cornerSnapXTargets.forEach((sx) => {
        const dot = this.documentRef.createElement('div');
        dot.className = 'dock-snap-marker';
        dot.style.left = `${sx}px`;
        dot.style.top = `${centerY}px`;
        layer.appendChild(dot);
      });
    }
    if (centerX != null) {
      this.cornerSnapYTargets.forEach((sy) => {
        const dot = this.documentRef.createElement('div');
        dot.className = 'dock-snap-marker';
        dot.style.left = `${centerX}px`;
        dot.style.top = `${sy}px`;
        layer.appendChild(dot);
      });
    }
  }

  private clearSnapMarkers(): void {
    if (!this.showSnapMarkers) return;
    const layer = this.shadowRoot?.querySelector<HTMLElement>('.dock-intersections-layer, .dock-intersection-layer');
    if (!layer) return;
    Array.from(layer.querySelectorAll('.dock-snap-marker')).forEach((el) => el.remove());
  }
  private pendingDragEndTimeout: number | NodeJS.Timeout | null = null;
  private previousSplitSizes: Map<string, number[]> = new Map();

  constructor() {
    super();
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
    this.onWindowResize = this.onWindowResize.bind(this);
  }

  override render(): TemplateResult {
    return template;
  }

  protected override firstUpdated(): void {
    // Resolve document and window now that we are connected.
    const documentRef = this.resolveDocument();
    this.documentRef = documentRef;
    this.windowRef = this.resolveWindow(documentRef);

    // Query the rendered shadow DOM for the dock skeleton.
    const shadowRoot = this.shadowRoot!;
    const root = shadowRoot.querySelector<HTMLElement>('.dock-root');
    if (!root) {
      throw new Error('mint-dock-manager template is missing the root element.');
    }
    const docked = shadowRoot.querySelector<HTMLElement>('.dock-docked');
    if (!docked) {
      throw new Error('mint-dock-manager template is missing the docked surface element.');
    }
    const floatingLayer = shadowRoot.querySelector<HTMLElement>('.dock-floating-layer');
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

    // Tag the docked surface with a root path so it can act as
    // a drop target when the main layout is empty.
    this.dockedEl.dataset['path'] = this.formatPath({ type: 'docked', segments: [] });

    // Now safe to attach shadow-DOM-targeted event listeners.
    this.rootEl.addEventListener('dragover', this.onDragOver);
    this.rootEl.addEventListener('drop', this.onDrop);
    this.rootEl.addEventListener('dragleave', this.onDragLeave);
    this.dropJoystick.addEventListener('dragover', this.onDragOver);
    this.dropJoystick.addEventListener('drop', this.onDrop);
    this.dropJoystick.addEventListener('dragleave', this.onDragLeave);
    this.dropJoystickButtons.forEach((btn) => {
      const handler = (e: DragEvent) => {
        if (!this.dragState) return;
        const z = btn.dataset['zone'];
        if (this.isDropZone(z)) {
          this.updateDropJoystickActiveZone(z);
          e.preventDefault();
        }
      };
      btn.addEventListener('dragenter', handler);
      btn.addEventListener('dragover', handler);
    });

    // Render any layout that was set before the shadow DOM existed.
    this.renderLayout();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'application');
    }
    const win = this.windowRef;
    win?.addEventListener('dragover', this.onGlobalDragOver);
    win?.addEventListener('drag', this.onDrag);
    win?.addEventListener('dragend', this.onGlobalDragEnd, true);
    win?.addEventListener('resize', this.onWindowResize);
  }

  override disconnectedCallback(): void {
    this.rootEl?.removeEventListener('dragover', this.onDragOver);
    this.rootEl?.removeEventListener('drop', this.onDrop);
    this.rootEl?.removeEventListener('dragleave', this.onDragLeave);
    this.dropJoystick?.removeEventListener('dragover', this.onDragOver);
    this.dropJoystick?.removeEventListener('drop', this.onDrop);
    this.dropJoystick?.removeEventListener('dragleave', this.onDragLeave);
    const win = this.windowRef;
    win?.removeEventListener('dragover', this.onGlobalDragOver);
    win?.removeEventListener('drag', this.onDrag);
    win?.removeEventListener('dragend', this.onGlobalDragEnd, true);
    this.stopDragPointerTracking();
    win?.removeEventListener('pointermove', this.onPointerMove);
    win?.removeEventListener('pointerup', this.onPointerUp);
    this.pointerTrackingActive = false;
    win?.removeEventListener('resize', this.onWindowResize);
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, _oldValue, newValue);
    if (name === 'layout') {
      this.layout = newValue ? this.parseLayout(newValue) : null;
    } else if (name === 'debug-snap-markers') {
      this.showSnapMarkers = !(newValue === null || newValue === 'false' || newValue === '0');
      if (!this.showSnapMarkers) {
        this.clearSnapMarkers();
      }
    }
  }

  get layout(): DockLayoutSnapshot {
    return {
      root: this.cloneLayoutNode(this.rootLayout),
      floating: this.cloneFloatingArray(this.floatingLayouts),
      titles: { ...this.titles },
    };
  }

  set layout(value: DockLayoutSnapshot | DockLayout | DockLayoutNode | null) {
    const snapshot = this.ensureSnapshot(value);
    // While a drag/resize is in flight, the dock manager is the source of
    // truth for layout state — its mid-drag mutations (e.g. floating bounds
    // updated every mousemove, or a stack split during a pane-drag-to-floating
    // conversion) race the host's two-way binding round-trip. The host re-
    // feeds the layout we *just* dispatched via `dock-layout-changed`, but by
    // the time the round-trip arrives the user has moved the cursor again, so
    // the structural-equality guard below would let it through and clobber the
    // in-progress state (e.g. snap a freshly-detached floating window back to
    // the converted-at coordinates instead of letting it follow the cursor).
    // Reject any external layout write during interaction; the host will sync
    // back to the dock's final state when interaction ends and the dock fires
    // a fresh dock-layout-changed event.
    if (this.isInteracting()) return;
    // Skip renderLayout when the incoming layout is structurally identical
    // to the current state. After a divider drag the dock dispatches
    // dock-layout-changed; an Angular host doing two-way binding will feed
    // that snapshot right back through `[layout]` (and through the
    // `[attr.layout]` round-trip). Without this guard, every drag-end
    // tears down and rebuilds the whole splitter tree, giving a one-frame
    // flash of `flex: 1 1 0` equal-share before the pin restores sizes.
    const currentJson = JSON.stringify({
      root: this.rootLayout,
      floating: this.floatingLayouts,
      titles: this.titles,
    });
    const newJson = JSON.stringify(snapshot);
    if (currentJson === newJson) return;

    this.rootLayout = this.cloneLayoutNode(snapshot.root);
    this.floatingLayouts = this.cloneFloatingArray(snapshot.floating);
    this.titles = snapshot.titles ? { ...snapshot.titles } : {};
    this.renderLayout();
  }

  /**
   * True while the user is actively interacting with the dock — pane drag,
   * floating window drag, floating window resize, or intersection corner
   * resize. The `set layout` setter consults this to refuse external
   * round-trips that would overwrite in-progress drag state.
   */
  private isInteracting(): boolean {
    return !!(
      this.dragState ||
      this.floatingDragState ||
      this.floatingResizeState ||
      this.cornerResizeState
    );
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
      return { root: null, floating: [], titles: {} };
    }

    if ((value as DockLayoutNode).kind) {
      return { root: value as DockLayoutNode, floating: [], titles: {} };
    }

    const layout = value as DockLayout | DockLayoutSnapshot;
    return {
      root: layout.root ?? null,
      floating: Array.isArray(layout.floating)
        ? layout.floating.map((floating) => this.normalizeFloatingLayout(floating))
        : [],
      titles: layout.titles ? { ...layout.titles } : {},
    };
  }

  private renderLayout(): void {
    // The layout setter may run before firstUpdated() has populated the
    // shadow-DOM fields (e.g. when an attribute is set on the markup).
    // Bail out; firstUpdated() will call renderLayout() once ready.
    if (!this.dockedEl) return;
    this.dockedEl.innerHTML = '';
    this.floatingLayerEl.innerHTML = '';
    this.hideDropIndicator();

    if (this.rootLayout) {
      const fragment = this.renderNode(this.rootLayout, []);
      this.dockedEl.appendChild(fragment);
    }

    this.renderFloatingPanes();
    this.scheduleRenderIntersectionHandles();
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

  private onWindowResize(): void {
    // Recompute intersection handles on window resize
    this.scheduleRenderIntersectionHandles();
  }

  private scheduleRenderIntersectionHandles(): void {
    this.intersectionRaf = null;
    this.renderIntersectionHandles();
  }

  private renderIntersectionHandles(): void {
    const layer = this.shadowRoot?.querySelector<HTMLElement>('.dock-intersections-layer, .dock-intersection-layer');
    if (!layer) return;
    // Keep existing handles; we will diff and update positions
    // 1) Clean up legacy handles (created before keying) that lack a data-key
    Array.from(layer.querySelectorAll('.dock-intersection-handle'))
      .filter((el) => !(el as HTMLElement).dataset['key'])
      .forEach((el) => el.remove());

    // 2) Rebuild the internal map from DOM to avoid drifting state and dedupe duplicates
    const domByKey = new Map<string, HTMLElement>();
    Array.from(layer.querySelectorAll<HTMLElement>('.dock-intersection-handle[data-key]')).forEach((el) => {
      const key = el.dataset['key'] ?? '';
      if (!key) return;
      if (domByKey.has(key)) {
        // Remove duplicates with the same key, keep the first one
        el.remove();
        return;
      }
      domByKey.set(key, el);
      // Ensure listener is attached only once
      if (!el.dataset['listener']) {
        el.dataset['listener'] = '1';
        // Listener will be (re)assigned later when we know the current h/v pair
      }
    });
    // Sync internal map with DOM
    this.intersectionHandles = domByKey;

    const rootRect = this.rootEl.getBoundingClientRect();

    // If a corner resize is active, only update that handle's position and avoid creating new ones
    if (this.cornerResizeState) {
      const st = this.cornerResizeState;
      const h0 = st.hs[0];
      const v0 = st.vs[0];
      const hPathStr = this.formatPath(h0.path);
      const vPathStr = this.formatPath(v0.path);
      const key = `${hPathStr}:${h0.index}|${vPathStr}:${v0.index}`;
      // Resolve the dividers via each splitter's shadow root.
      const hSplitter = this.findSplitterByPath(h0.path.segments);
      const vSplitter = this.findSplitterByPath(v0.path.segments);
      const hDiv = hSplitter ? this.getSplitterDividers(hSplitter)[h0.index] : null;
      const vDiv = vSplitter ? this.getSplitterDividers(vSplitter)[v0.index] : null;
      if (hDiv && vDiv) {
        const hr = hDiv.getBoundingClientRect();
        const vr = vDiv.getBoundingClientRect();
        const x = vr.left + vr.width / 2 - rootRect.left;
        const y = hr.top + hr.height / 2 - rootRect.top;
        const handle = st.handle;
        if (!handle.dataset['key']) {
          handle.dataset['key'] = key;
        }
        this.intersectionHandles.set(key, handle);
        handle.style.left = `${x}px`;
        handle.style.top = `${y}px`;
        // Remove any other handles that don't match the active key
        Array.from(layer.querySelectorAll<HTMLElement>('.dock-intersection-handle')).forEach((el) => {
          if ((el.dataset['key'] ?? '') !== key) {
            el.remove();
          }
        });
        // Normalize internal map as well
        this.intersectionHandles = new Map([[key, handle]]);
      }
      return;
    }
    // Each <mp-splitter class="dock-split"> hosts its dividers inside its
    // shadow root. Walk every splitter, then flat-map its shadow dividers
    // into the h/v buckets driven by the splitter's data-direction.
    const allSplitters = Array.from(
      this.shadowRoot?.querySelectorAll<HTMLElement>('.dock-split') ?? [],
    );

    type DividerInfo = {
      el: HTMLElement;
      rect: DOMRect;
      path: DockPath | null;
      pathStr: string;
      index: number;
      container: HTMLElement;
    };
    const hDividers: DividerInfo[] = [];
    const vDividers: DividerInfo[] = [];

    allSplitters.forEach((splitter) => {
      const direction = (splitter.dataset['direction'] as 'horizontal' | 'vertical' | undefined) ?? undefined;
      const pathStr = splitter.dataset['path'] ?? '';
      const path = this.parsePath(pathStr);
      this.getSplitterDividers(splitter).forEach((el, index) => {
        const info: DividerInfo = {
          el,
          rect: el.getBoundingClientRect(),
          path,
          pathStr,
          index,
          container: splitter,
        };
        // node.direction === 'horizontal' means children flow left-to-right,
        // which yields VERTICAL divider bars (and vice-versa).
        if (direction === 'horizontal') {
          vDividers.push(info);
        } else if (direction === 'vertical') {
          hDividers.push(info);
        }
      });
    });

    const desiredKeys = new Set<string>();

    const tol = 24; // px tolerance to account for gaps and subpixel layout
    const groupMap = new Map<string, HTMLElement>();
    const groupPairs = new Map<string, Array<{ h: { pathStr: string; index: number }; v: { pathStr: string; index: number } }>>();
    hDividers.forEach((h) => {
      const hCenterY = h.rect.top + h.rect.height / 2;
      vDividers.forEach((v) => {
        const vCenterX = v.rect.left + v.rect.width / 2;
        const dx = vCenterX < h.rect.left ? h.rect.left - vCenterX : vCenterX > h.rect.right ? vCenterX - h.rect.right : 0;
        const dy = hCenterY < v.rect.top ? v.rect.top - hCenterY : hCenterY > v.rect.bottom ? hCenterY - v.rect.bottom : 0;
        if (dx > tol || dy > tol) return;

        const x = vCenterX - rootRect.left;
        const y = hCenterY - rootRect.top;
        const key = `${h.pathStr}:${h.index}|${v.pathStr}:${v.index}`;
        const gk = `${Math.round(x)}:${Math.round(y)}`;
        let handle = groupMap.get(gk);
        if (!handle) {
          // Try reuse via existing pair mapping
          handle = this.intersectionHandles.get(key) ?? null as any;
          if (!handle) {
            handle = this.documentRef.createElement('div');
            handle.classList.add('dock-intersection-handle', 'glyph');
            handle.setAttribute('role', 'separator');
            handle.setAttribute('aria-label', 'Resize split intersection');
            handle.dataset['key'] = key;
            handle.dataset['listener'] = '1';
            handle.addEventListener('pointerdown', (ev) => this.beginCornerResize(ev, h, v, handle!));
            handle.addEventListener('dblclick', (ev) => this.onIntersectionDoubleClick(ev, handle!));
            layer.appendChild(handle);
          }
          groupMap.set(gk, handle);
        }
        // Track pairs for this group and map all pair keys to the same handle
        const arr = groupPairs.get(gk) ?? [];
        arr.push({ h: { pathStr: h.pathStr ?? '', index: h.index }, v: { pathStr: v.pathStr ?? '', index: v.index } });
        groupPairs.set(gk, arr);
        this.intersectionHandles.set(key, handle);
        // Update position for the grouped handle
        handle.style.left = `${x}px`;
        handle.style.top = `${y}px`;
      });
    });

    // Attach grouped pairs data to each handle and prune stale ones
    const keep = new Set<HTMLElement>(groupMap.values());
    groupMap.forEach((handle, gk) => {
      const pairs = groupPairs.get(gk) ?? [];
      handle.dataset['pairs'] = JSON.stringify(pairs);
    });
    Array.from(layer.querySelectorAll<HTMLElement>('.dock-intersection-handle')).forEach((el) => {
      if (!keep.has(el)) {
        el.remove();
      }
    });
    // Reset intersectionHandles to only currently mapped keys
    const newMap = new Map<string, HTMLElement>();
    groupPairs.forEach((pairs, gk) => {
      const handle = groupMap.get(gk)!;
      pairs.forEach((p) => newMap.set(`${p.h.pathStr}:${p.h.index}|${p.v.pathStr}:${p.v.index}`, handle));
    });
    this.intersectionHandles = newMap;
  }

  private beginCornerResize(
    event: PointerEvent,
    h: { path: DockPath | null; index: number; container: HTMLElement; rect: DOMRect },
    v: { path: DockPath | null; index: number; container: HTMLElement; rect: DOMRect },
    handle: HTMLElement,
  ): void {
    event.preventDefault();

    // Build pairs from dataset if available (grouped intersections), otherwise from the provided pair
    const pairsRaw = handle.dataset['pairs'];
    const parsed: Array<{ h: { pathStr: string; index: number }; v: { pathStr: string; index: number } }> =
      pairsRaw ? JSON.parse(pairsRaw) : [];
    const hs: Array<{ path: DockPath; index: number; container: HTMLElement; initialSizes: number[]; before: number; after: number }>=[];
    const vs: Array<{ path: DockPath; index: number; container: HTMLElement; initialSizes: number[]; before: number; after: number }>=[];

    const ensureHV = (pathStr: string, index: number, axis: 'h'|'v') => {
      const path = this.parsePath(pathStr);
      if (!path) return;
      const splitter = this.findSplitterByPath(path.segments);
      if (!splitter) return;
      // Initial pixel sizes come from each panel-wrapper inside the splitter's
      // shadow root. We capture them once on pointerdown and feed deltas to
      // setPanelSizes() during the drag.
      const panels = this.getSplitterPanels(splitter);
      if (panels.length === 0) return;
      const dim: 'height' | 'width' = axis === 'h' ? 'height' : 'width';
      const initial = panels.map((p) => p.getBoundingClientRect()[dim]);
      const entry = { path, index, container: splitter, initialSizes: initial, before: initial[index], after: initial[index + 1] };
      if (axis === 'h') hs.push(entry);
      else vs.push(entry);
    };

    if (parsed.length > 0) {
      parsed.forEach((p) => { ensureHV(p.h.pathStr, p.h.index, 'h'); ensureHV(p.v.pathStr, p.v.index, 'v'); });
    } else if (h.path && v.path) {
      ensureHV(this.formatPath(h.path), h.index, 'h');
      ensureHV(this.formatPath(v.path), v.index, 'v');
    }
    if (hs.length === 0 && vs.length === 0) return;

    try {
      handle.setPointerCapture(event.pointerId);
      handle.dataset['resizing'] = 'true';
      handle.classList.add('hovering');
    } catch {}

    this.cornerResizeState = {
      pointerId: event.pointerId,
      handle,
      hs: hs.map((e) => ({ path: this.clonePath(e.path), index: e.index, container: e.container, beforeSize: e.before, afterSize: e.after, initialSizes: e.initialSizes, startY: event.clientY })),
      vs: vs.map((e) => ({ path: this.clonePath(e.path), index: e.index, container: e.container, beforeSize: e.before, afterSize: e.after, initialSizes: e.initialSizes, startX: event.clientX })),
    };

    this.startPointerTracking();
    // Ensure handle has a stable key (use group if present)
    if (!handle.dataset['key']) {
      handle.dataset['key'] = handle.dataset['group'] ?? '';
    }
    this.renderSnapMarkersForCorner();

    // Compute localized snap targets for this intersection
    try {
      const rootRect = this.rootEl.getBoundingClientRect();
      // Use first pair to define the crossing lines. Resolve dividers via
      // each splitter's shadow root.
      let centerX: number | null = null;
      let centerY: number | null = null;
      if (vs.length > 0) {
        const vPair = vs[0];
        const vDiv = this.getSplitterDividers(vPair.container)[vPair.index];
        const vr = vDiv?.getBoundingClientRect();
        if (vr) centerX = vr.left + vr.width / 2;
      }
      if (hs.length > 0) {
        const hPair = hs[0];
        const hDiv = this.getSplitterDividers(hPair.container)[hPair.index];
        const hr = hDiv?.getBoundingClientRect();
        if (hr) centerY = hr.top + hr.height / 2;
      }

      const xTargets: number[] = [];
      const yTargets: number[] = [];
      // Iterate every splitter, then flat-map its shadow dividers — a
      // splitter's data-direction tells us whether its bars are vertical
      // (horizontal split) or horizontal (vertical split).
      const allSplitters = Array.from(
        this.shadowRoot?.querySelectorAll<HTMLElement>('.dock-split') ?? [],
      );
      allSplitters.forEach((splitter) => {
        const direction = (splitter.dataset['direction'] as 'horizontal' | 'vertical' | undefined) ?? undefined;
        this.getSplitterDividers(splitter).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (direction === 'horizontal' && centerY != null) {
            // vertical bar → contributes X if it crosses centerY
            if (centerY >= r.top && centerY <= r.bottom) {
              xTargets.push(r.left + r.width / 2 - rootRect.left);
            }
          } else if (direction === 'vertical' && centerX != null) {
            // horizontal bar → contributes Y if it crosses centerX
            if (centerX >= r.left && centerX <= r.right) {
              yTargets.push(r.top + r.height / 2 - rootRect.top);
            }
          }
        });
      });
      this.cornerSnapXTargets = xTargets;
      this.cornerSnapYTargets = yTargets;
    } catch {
      this.cornerSnapXTargets = [];
      this.cornerSnapYTargets = [];
    }
  }

  private handleCornerResizeMove(event: PointerEvent): void {
    const state = this.cornerResizeState;
    if (!state || state.pointerId !== event.pointerId) return;

    const snapValue = (val: number, total: number, active: boolean) => {
      if (!active || total <= 0) return val;
      const ratios = [1/3, 1/2, 2/3];
      const r = val / total;
      let best = ratios[0];
      let d = Math.abs(r - best);
      for (let i=1;i<ratios.length;i++){ const dd = Math.abs(r - ratios[i]); if (dd < d) { d = dd; best = ratios[i]; } }
      return best * total;
    };

    // Axis snapping to nearby intersections
    const tol = 10;
    const rootRect = this.rootEl.getBoundingClientRect();
    let clientX = event.clientX;
    let clientY = event.clientY;
    if (this.cornerSnapXTargets.length) {
      let best = clientX, bestDist = tol + 1;
      this.cornerSnapXTargets.forEach((sx) => {
        const px = rootRect.left + sx; const d = Math.abs(px - clientX); if (d < bestDist) { bestDist = d; best = px; }
      });
      if (bestDist <= tol) clientX = best;
    }
    if (this.cornerSnapYTargets.length) {
      let best = clientY, bestDist = tol + 1;
      this.cornerSnapYTargets.forEach((sy) => {
        const py = rootRect.top + sy; const d = Math.abs(py - clientY); if (d < bestDist) { bestDist = d; best = py; }
      });
      if (bestDist <= tol) clientY = best;
    }

    // Apply the new pair sizes to one splitter's panel-wrappers via
    // mp-splitter's setPanelSizes(pixels) API. We persist the normalized
    // ratios on the layout node so renderSplit's initial sizing stays in sync.
    const applyPairSize = (
      entry: {
        path: DockPath;
        index: number;
        container: HTMLElement;
        beforeSize: number;
        afterSize: number;
        initialSizes: number[];
      },
      delta: number,
    ): void => {
      const node = this.resolveSplitNode(entry.path);
      if (!node) return;
      const minSize = 48;
      const pairTotal = entry.beforeSize + entry.afterSize;
      let newBefore = Math.min(Math.max(entry.beforeSize + delta, minSize), pairTotal - minSize);
      newBefore = snapValue(newBefore, pairTotal, event.shiftKey);
      const newAfter = pairTotal - newBefore;
      const sizesPx = [...entry.initialSizes];
      sizesPx[entry.index] = newBefore;
      sizesPx[entry.index + 1] = newAfter;
      const total = sizesPx.reduce((a, s) => a + s, 0);
      node.sizes = total > 0 ? sizesPx.map((s) => s / total) : [];
      (entry.container as unknown as { setPanelSizes?: (sizes: number[]) => void })
        .setPanelSizes?.(sizesPx);
    };

    // Update all horizontal bars (vertical splits) with Y delta, then all
    // vertical bars (horizontal splits) with X delta.
    state.hs.forEach((h) => applyPairSize(h, clientY - h.startY));
    state.vs.forEach((v) => applyPairSize(v, clientX - v.startX));

    this.dispatchLayoutChanged();
  }

  private endCornerResize(pointerId: number): void {
    const state = this.cornerResizeState;
    if (!state || pointerId !== state.pointerId) return;
    try {
      state.handle.releasePointerCapture(state.pointerId);
    } catch {}
    state.handle.dataset['resizing'] = 'false';
    this.cornerResizeState = null;
    // Re-render handles to account for new positions
    this.scheduleRenderIntersectionHandles();
    this.cornerSnapXTargets = [];
    this.cornerSnapYTargets = [];
  }

  private onIntersectionDoubleClick(event: MouseEvent, handle: HTMLElement): void {
    event.preventDefault();
    const pairsRaw = handle.dataset['pairs'];
    const parsed: Array<{ h: { pathStr: string; index: number }; v: { pathStr: string; index: number } }>
      = pairsRaw ? JSON.parse(pairsRaw) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const k = handle.dataset['key'] ?? '';
      const parts = k.split('|');
      if (parts.length === 2) {
        const [hPart, vPart] = parts;
        const hi = hPart.lastIndexOf(':');
        const vi = vPart.lastIndexOf(':');
        if (hi > 0 && vi > 0) {
          const hPathStr = hPart.slice(0, hi);
          const vPathStr = vPart.slice(0, vi);
          const hIdx = Number.parseInt(hPart.slice(hi + 1), 10);
          const vIdx = Number.parseInt(vPart.slice(vi + 1), 10);
          parsed.push({ h: { pathStr: hPathStr, index: hIdx }, v: { pathStr: vPathStr, index: vIdx } });
        }
      }
    }
    if (parsed.length === 0) return;

    const splitKeys = new Set<string>();
    parsed.forEach((p) => { splitKeys.add(p.h.pathStr); splitKeys.add(p.v.pathStr); });
    let hasStored = false;
    splitKeys.forEach((k) => { if (this.previousSplitSizes.has(k)) hasStored = true; });

    // Persist `node.sizes` (normalized) and push pixel sizes into the
    // matching <mp-splitter> via setPanelSizes(). The splitter's panel
    // wrappers live in its shadow DOM, so direct flex mutation is no
    // longer an option.
    const pushSizesToSplitter = (path: DockPath, normalized: number[]): void => {
      const splitter = this.findSplitterByPath(path.segments);
      if (!splitter) return;
      const direction = (splitter.dataset['direction'] as 'horizontal' | 'vertical' | undefined) ?? 'horizontal';
      const containerSize = direction === 'horizontal'
        ? splitter.getBoundingClientRect().width
        : splitter.getBoundingClientRect().height;
      if (!Number.isFinite(containerSize) || containerSize <= 0) return;
      const totalWeight = normalized.reduce((s, w) => s + Math.max(w, 0), 0);
      if (totalWeight <= 0) return;
      const px = normalized.map((w) => (Math.max(w, 0) / totalWeight) * containerSize);
      (splitter as unknown as { setPanelSizes?: (sizes: number[]) => void })
        .setPanelSizes?.(px);
    };

    const applySizes = (pathStr: string, dividerIndex: number, mutate: (sizes: number[], index: number) => number[]) => {
      const path = this.parsePath(pathStr);
      if (!path) return;
      const node = this.resolveSplitNode(path);
      if (!node) return;
      const sizes = this.normalizeSizesArray(node.sizes ?? [], node.children.length);
      const newSizes = mutate([...sizes], dividerIndex);
      node.sizes = newSizes;
      pushSizesToSplitter(path, newSizes);
    };

    if (hasStored) {
      // Restore stored sizes
      this.previousSplitSizes.forEach((sizes, pathStr) => {
        const path = this.parsePath(pathStr);
        const node = path ? this.resolveSplitNode(path) : null;
        if (!node || !path) return;
        const norm = this.normalizeSizesArray(sizes, node.children.length);
        node.sizes = norm;
        pushSizesToSplitter(path, norm);
      });
      this.previousSplitSizes.clear();
    } else {
      // Equalize the two panes adjacent to each divider and store previous sizes
      const touched = new Set<string>();
      parsed.forEach((p) => {
        [p.h.pathStr, p.v.pathStr].forEach((key) => {
          if (touched.has(key)) return;
          const path = this.parsePath(key);
          const node = path ? this.resolveSplitNode(path) : null;
          if (node && Array.isArray(node.sizes)) {
            this.previousSplitSizes.set(key, [...node.sizes]);
          }
          touched.add(key);
        });
        const equalize = (sizes: number[], idx: number): number[] => {
          const total = (sizes[idx] ?? 0) + (sizes[idx + 1] ?? 0);
          if (total <= 0) return sizes;
          sizes[idx] = total / 2;
          sizes[idx + 1] = total / 2;
          const sum = sizes.reduce((a, s) => a + s, 0);
          return sum > 0 ? sizes.map((s) => s / sum) : sizes;
        };
        applySizes(p.h.pathStr, p.h.index, equalize);
        applySizes(p.v.pathStr, p.v.index, equalize);
      });
    }

    this.dispatchLayoutChanged();
    this.scheduleRenderIntersectionHandles();
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
      handle.dataset['resizing'] = 'true';
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
    // Clear outside the try so a thrown releasePointerCapture (capture
    // already lost) doesn't strand the handle in its visual drag state.
    delete state.handle.dataset['resizing'];

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

    // Reset sticky zone when moving to another stack while dragging the
    // floating window so the side doesn't carry over.
    if (this.dropJoystickTarget && this.dropJoystickTarget !== stack) {
      delete this.dropJoystick.dataset['zone'];
      this.updateDropJoystickActiveZone(null);
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
    // Clear `data-resizing` outside the try — releasePointerCapture can
    // throw if the capture was already lost (e.g., the pointer left the
    // window), and we still need to drop the resizing attribute or the
    // CSS rule `.dock-floating__resizer[data-resizing='true']` keeps the
    // border dark-blue forever.
    delete state.handle.dataset['resizing'];

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
      !this.floatingDragState &&
      !this.floatingResizeState &&
      !this.cornerResizeState
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

    return this.titles[preferred] ?? preferred ?? fallback;
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
    // Each DockSplitNode renders as <mp-splitter>. The dock keeps its `.dock-split`
    // class on the host so existing `closest('.dock-split')` queries continue to
    // resolve, and stamps `data-direction` / `data-path` for the tree-driven
    // intersection-handle math.
    const splitter = this.documentRef.createElement('mp-splitter') as HTMLElement;
    splitter.classList.add('dock-split');
    splitter.dataset['direction'] = node.direction;
    splitter.dataset['path'] = path.join('/');
    // mp-splitter uses 'horizontal' (left-right) and 'vertical' (top-bottom).
    // The dock's DockSplitNode.direction matches that vocabulary 1:1.
    splitter.setAttribute('orientation', node.direction);

    const splitPath: DockPath =
      typeof floatingIndex === 'number'
        ? { type: 'floating', index: floatingIndex, segments: [...path] }
        : { type: 'docked', segments: [...path] };

    node.children.forEach((child, index) => {
      // mp-splitter accepts direct children — it wraps each in a panel-wrapper
      // inside its shadow DOM and projects via a named slot per index.
      splitter.appendChild(this.renderNode(child, [...path, index], floatingIndex));
    });

    // Apply persisted sizes from the layout tree once mp-splitter has built
    // its panel wrappers. mp-splitter's setPanelSizes interprets values as
    // pixel widths/heights; the dock's saved sizes are flex weights, so
    // convert using the splitter's measured cross-axis container size.
    const sizes = Array.isArray(node.sizes) ? node.sizes : [];
    if (sizes.length > 0) {
      requestAnimationFrame(() => {
        const totalWeight = sizes.reduce((s, w) => s + Math.max(w, 0), 0);
        if (totalWeight <= 0) return;
        const containerSize =
          node.direction === 'horizontal'
            ? splitter.getBoundingClientRect().width
            : splitter.getBoundingClientRect().height;
        if (!Number.isFinite(containerSize) || containerSize <= 0) return;
        const px = sizes.map((w) => (Math.max(w, 0) / totalWeight) * containerSize);
        (splitter as unknown as { setPanelSizes?: (sizes: number[]) => void })
          .setPanelSizes?.(px);
      });
    }

    // mp-splitter fires resize-end with pixel sizes after a divider drag.
    // Convert back to flex weights (sum to a stable total — keep current sum
    // so future renders interpret consistently) and persist to the layout tree.
    splitter.addEventListener('resize-end', (event) => {
      // resize-end bubbles, so a nested mp-splitter's drag end would also
      // reach this listener. Only react to events from THIS splitter, not
      // from a descendant — otherwise we'd apply the inner's sizes to the
      // outer's splitNode and mangle the outer's weights.
      if (event.target !== splitter) return;
      const detail = (event as CustomEvent<{ sizes: number[] }>).detail;
      if (!Array.isArray(detail?.sizes) || detail.sizes.length === 0) return;
      const splitNode = this.resolveSplitNode(splitPath);
      if (!splitNode) return;
      const previousTotal = (splitNode.sizes ?? []).reduce(
        (s, w) => s + Math.max(w, 0),
        0,
      );
      const total = detail.sizes.reduce((s, v) => s + Math.max(v, 0), 0);
      const targetTotal = previousTotal > 0 ? previousTotal : detail.sizes.length;
      if (total > 0) {
        splitNode.sizes = detail.sizes.map(
          (px) => (Math.max(px, 0) / total) * targetTotal,
        );
        this.dispatchLayoutChanged();
      }
    });

    return splitter;
  }

  private renderStack(
    node: DockStackNode,
    path: number[],
    floatingIndex?: number,
  ): HTMLElement {
    // Dock stacks are rendered as <mp-tab-control>. The dock keeps `.dock-stack`
    // as a class on the host so existing `closest('.dock-stack')` queries
    // continue to resolve. The tab strip + body slot projection are owned by
    // mp-tab-control; the dock just provides the slotted header/content
    // elements and listens for tab-activate to drive layout-tree updates.
    const stack = this.documentRef.createElement('mp-tab-control') as HTMLElement;
    stack.classList.add('dock-stack');
    // Dock controls activation; tell mp-tab-control not to auto-pick.
    stack.setAttribute('select-first-tab', 'false');
    // `border="top"` gives us the strip-cutout line under the tabs (so the
    // active tab visually punches through into the body) without adding the
    // full Bootstrap frame, which would double up with the dock's own outer
    // chrome border on `.dock-stack` (and on `.dock-floating` for floating
    // panels).
    stack.setAttribute('border', 'top');

    const location: DockPath =
      typeof floatingIndex === 'number'
        ? { type: 'floating', index: floatingIndex, segments: [...path] }
        : { type: 'docked', segments: [...path] };
    stack.dataset['path'] = this.formatPath(location);

    const panes = Array.from(new Set(node.panes));
    if (panes.length === 0) {
      const emptyHeader = this.documentRef.createElement('span');
      emptyHeader.setAttribute('slot', '__empty__-header');
      emptyHeader.textContent = '(empty)';
      const empty = this.documentRef.createElement('div');
      empty.setAttribute('slot', '__empty__-content');
      empty.classList.add('dock-stack__pane');
      empty.textContent = 'No panes configured';
      stack.append(emptyHeader, empty);
      stack.setAttribute('active-tab', '__empty__');
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

      // Header span — projected via mp-tab-control's `${tabId}-header` slot
      // into the strip's button content. Carries the dock's drag handlers.
      const headerSpan = this.documentRef.createElement('span');
      headerSpan.setAttribute('slot', `${tabId}-header`);
      headerSpan.classList.add('dock-tab');
      headerSpan.dataset['pane'] = paneName;
      headerSpan.dataset['tabId'] = tabId;
      headerSpan.textContent = this.titles[paneName] ?? paneName;
      headerSpan.draggable = true;

      headerSpan.addEventListener('pointerdown', (event) => {
        this.captureTabDragMetrics(event, stack);
        event.stopPropagation();
      });
      headerSpan.addEventListener('pointerup', () => this.clearPendingTabDragMetrics());
      headerSpan.addEventListener('pointercancel', () => this.clearPendingTabDragMetrics());
      headerSpan.addEventListener('dragstart', (event) => {
        this.beginPaneDrag(event, this.clonePath(location), paneName, stack);
      });
      headerSpan.addEventListener('dragend', () => {
        this.endPaneDrag();
        this.clearPendingTabDragMetrics();
      });

      // Content wrapper — projected via mp-tab-control's `${tabId}-content`
      // slot only when this tab is active. Holds the dock manager's per-pane
      // <slot> for the consumer's content.
      const paneHost = this.documentRef.createElement('div');
      paneHost.setAttribute('slot', `${tabId}-content`);
      paneHost.classList.add('dock-stack__pane');
      paneHost.dataset['pane'] = paneName;
      paneHost.dataset['tabId'] = tabId;
      paneHost.id = panelId;

      const slotEl = this.documentRef.createElement('slot');
      slotEl.name = paneName;
      paneHost.appendChild(slotEl);

      stack.append(headerSpan, paneHost);

      if (paneName === activePane) {
        stack.setAttribute('active-tab', tabId);
      }
    });

    stack.dataset['activePane'] = activePane;

    // Drive activatePane from mp-tab-control's tab-activate event. We map the
    // tabId back to the original paneName via the header span's data-pane.
    stack.addEventListener('tab-activate', (event) => {
      const detail = (event as CustomEvent<{ tabId: string }>).detail;
      const headerSpan = stack.querySelector<HTMLElement>(
        `:scope > [data-tab-id="${detail.tabId}"]`,
      );
      const paneName = headerSpan?.dataset['pane'];
      if (paneName) {
        this.activatePane(stack, paneName, this.clonePath(location));
        this.dispatchEvent(
          new CustomEvent('dock-pane-activated', {
            detail: { pane: paneName },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    return stack;
  }

  /**
   * Returns the strip (`.tsc`) element inside an `<mp-tab-control>`'s shadow
   * DOM. Used by drag/drop logic that needs the strip's geometry instead of
   * the host element's bounds.
   */
  private getStackStripEl(stack: HTMLElement): HTMLElement | null {
    if (stack.tagName !== 'MP-TAB-CONTROL') return null;
    return stack.shadowRoot?.querySelector<HTMLElement>('.tsc') ?? null;
  }

  /**
   * Returns the rendered tab buttons inside an `<mp-tab-control>`'s shadow
   * strip — the light-DOM `.dock-tab` spans the dock owns are projected into
   * these buttons via `<slot>`. Use these for geometry / position queries
   * (insert-index computation, drop-indicator placement). Use the light-DOM
   * `.dock-tab` spans for data queries (paneName, drag listeners).
   */
  private getStackTabButtons(stack: HTMLElement): HTMLButtonElement[] {
    if (stack.tagName !== 'MP-TAB-CONTROL') return [];
    return Array.from(
      stack.shadowRoot?.querySelectorAll<HTMLButtonElement>('button.nav-link') ?? [],
    );
  }

  /**
   * Returns the dividers inside an `<mp-splitter>`'s shadow DOM, in DOM order.
   * mp-splitter renders one `.divider` between each pair of adjacent panels,
   * so for an N-child split, length N-1.
   */
  private getSplitterDividers(splitter: HTMLElement): HTMLElement[] {
    if (splitter.tagName !== 'MP-SPLITTER') return [];
    return Array.from(
      splitter.shadowRoot?.querySelectorAll<HTMLElement>('.divider') ?? [],
    );
  }

  /**
   * Returns the panel wrappers inside an `<mp-splitter>`'s shadow DOM, in
   * DOM order. These are the elements mp-splitter sizes (via setPanelSizes)
   * during a divider drag — the dock reads their geometry for intersection
   * handle math and snap markers.
   */
  private getSplitterPanels(splitter: HTMLElement): HTMLElement[] {
    if (splitter.tagName !== 'MP-SPLITTER') return [];
    return Array.from(
      splitter.shadowRoot?.querySelectorAll<HTMLElement>('.panel-wrapper') ?? [],
    );
  }

  /**
   * Locate the rendered `<mp-splitter>` element for a given DockPath
   * `segments` value (the split-tree path). Searches the dock's shadow.
   */
  private findSplitterByPath(segments: number[]): HTMLElement | null {
    return (
      this.shadowRoot?.querySelector<HTMLElement>(
        `.dock-split[data-path="${segments.join('/')}"]`,
      ) ?? null
    );
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.cornerResizeState && event.pointerId === this.cornerResizeState.pointerId) {
      this.handleCornerResizeMove(event);
    }

    if (this.floatingResizeState && event.pointerId === this.floatingResizeState.pointerId) {
      this.handleFloatingResizeMove(event);
    }

    if (this.floatingDragState && event.pointerId === this.floatingDragState.pointerId) {
      this.handleFloatingDragMove(event);
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.cornerResizeState && event.pointerId === this.cornerResizeState.pointerId) {
      this.endCornerResize(event.pointerId);
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
      startClientX: event.clientX,
      startClientY: event.clientY,
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

    // Create a ghost element for the drag image. This prevents the browser from cancelling
    // the drag operation when the original element is removed from the DOM during re-render.
    const ghost = (event.currentTarget as HTMLElement).cloneNode(true) as HTMLElement;
    ghost.style.position = 'absolute';
    ghost.style.left = '-9999px';
    ghost.style.top = '-9999px';
    ghost.style.width = `${(event.currentTarget as HTMLElement).offsetWidth}px`;
    ghost.style.height = `${(event.currentTarget as HTMLElement).offsetHeight}px`;
    this.shadowRoot?.appendChild(ghost);

    // Use the ghost element as the drag image.
    // The offset is set to where the user's cursor is on the original element.
    const dragImgOffsetX = Number.isFinite((event as any).offsetX) ? (event as any).offsetX : 0;
    const dragImgOffsetY = Number.isFinite((event as any).offsetY) ? (event as any).offsetY : 0;
    event.dataTransfer.setDragImage(ghost, dragImgOffsetX, dragImgOffsetY);

    // The ghost element is no longer needed after the drag image is set.
    // We defer its removal to ensure the browser has captured it.
    setTimeout(() => ghost.remove(), 0);

    const {
      path: sourcePath,
      floatingIndex,
      pointerOffsetX,
      pointerOffsetY,
    } = this.preparePaneDragSource(path, pane, stackEl, event);

    // Capture header bounds for detecting when to convert to floating.
    // The strip lives inside the mp-tab-control's shadow as `.tsc`.
    const headerEl = stackEl ? this.getStackStripEl(stackEl) : null;
    const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
    const headerBounds = headerRect
      ? { left: headerRect.left, top: headerRect.top, right: headerRect.right, bottom: headerRect.bottom }
      : null;
    const metrics = this.pendingTabDragMetrics;

    this.dragState = {
      pane,
      sourcePath: this.clonePath(sourcePath),
      floatingIndex,
      pointerOffsetX,
      pointerOffsetY,
      dropHandled: false,
      sourceStackEl: stackEl,
      sourceHeaderBounds: headerBounds,
      startClientX:
        metrics && Number.isFinite(metrics.startClientX)
          ? metrics.startClientX
          : Number.isFinite(event.clientX)
          ? event.clientX
          : undefined,
      startClientY:
        metrics && Number.isFinite(metrics.startClientY)
          ? metrics.startClientY
          : Number.isFinite(event.clientY)
          ? event.clientY
          : undefined,
    };
    // Seed last known pointer position from pointerdown metrics to avoid (0,0) glitches in Firefox
    if (
      this.dragState.startClientX !== undefined &&
      this.dragState.startClientY !== undefined &&
      Number.isFinite(this.dragState.startClientX) &&
      Number.isFinite(this.dragState.startClientY)
    ) {
      this.lastDragPointerPosition = {
        x: this.dragState.startClientX as number,
        y: this.dragState.startClientY as number,
      };
    }
    // Prefer the pointer offset relative to the dragged tab to avoid jumps on conversion
    if (Number.isFinite((event as any).offsetX)) {
      this.dragState.pointerOffsetX = (event as any).offsetX as number;
    }
    if (Number.isFinite((event as any).offsetY)) {
      this.dragState.pointerOffsetY = (event as any).offsetY as number;
    }
    this.updateDraggedFloatingPosition(event);
    this.startDragPointerTracking();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pane);

    // Preferred UX: if the dragged tab is the only one in its stack,
    // immediately convert to a floating window unless it is already the
    // only pane in a floating window (this case is handled by reuse logic).
    if (this.dragState && this.dragState.floatingIndex !== null && this.dragState.floatingIndex < 0) {
      const loc = this.resolveStackLocation(this.dragState.sourcePath);
      if (loc && Array.isArray(loc.node.panes) && loc.node.panes.length === 1) {
        let shouldConvert = false;
        if (loc.context === "docked") {
          shouldConvert = true;
        } else if (loc.context === "floating") {
          const floating = this.floatingLayouts[loc.index];
          const totalPanes = floating && floating.root ? this.countPanesInTree(floating.root) : 0;
          shouldConvert = totalPanes > 1; // not the only pane in this floating window
        }
        if (shouldConvert) {
          const startX = Number.isFinite(event.clientX) ? event.clientX : (this.dragState.startClientX ?? 0);
          const startY = Number.isFinite(event.clientY) ? event.clientY : (this.dragState.startClientY ?? 0);
          this.convertPendingTabDragToFloating(startX, startY);
        }
      }
    }
  }

  private preparePaneDragSource(
    path: DockPath,
    pane: string,
    stackEl: HTMLElement | null,
    event: DragEvent,
  ): { path: DockPath; floatingIndex: number | null; pointerOffsetX: number; pointerOffsetY: number } {
    const location = this.resolveStackLocation(path);
    if (!location || !location.node.panes.includes(pane)) {
      return {
        path,
        floatingIndex: null,
        pointerOffsetX: 0,
        pointerOffsetY: 0,
      };
    }
    const metrics = this.pendingTabDragMetrics;

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
    // Do not convert to floating yet; allow in-header reordering first.
    // We return placeholder values and will convert once the pointer leaves the tab header.
    const pointerOffsetXVal =
      metrics && Number.isFinite(metrics.pointerOffsetX)
        ? metrics.pointerOffsetX
        : 0;
    const pointerOffsetYVal =
      metrics && Number.isFinite(metrics.pointerOffsetY)
        ? metrics.pointerOffsetY
        : 0;

    return {
      path,
      floatingIndex: -1,
      pointerOffsetX: pointerOffsetXVal,
      pointerOffsetY: pointerOffsetYVal,
    };
  }

  private endPaneDrag(): void {
    this.clearPendingDragEndTimeout();
    // Restore the dragged tab's `data-hidden` and remove the placeholder span
    // BEFORE we null out dragState — clearHeaderDragPlaceholder reads
    // `dragState.placeholderEl`, `dragState.placeholderHeader`, and
    // `dragState.pane` to know what to restore. If dragState is nulled first,
    // this becomes a silent no-op and the dragged pane stays hidden in its
    // source stack while the placeholder span lingers in the strip — which
    // is exactly the "Panel disappears, only a small tab-thumb remains"
    // regression the multi-pane drag-out path can otherwise trigger when
    // no renderLayout() runs between conversion and end (e.g. user releases
    // outside any drop zone, or HTML5 dragend fires without a drop).
    this.clearHeaderDragPlaceholder();
    const state = this.dragState;
    this.dragState = null;
    this.hideDropIndicator();
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
    // Keep internal pointer tracking up-to-date.
    this.updateDraggedFloatingPosition(event);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    // Some browsers intermittently report (0,0) for dragover coordinates.
    // Mirror the robust logic used in onDrop: prefer actual event coordinates
    // when valid, otherwise fall back to the last tracked pointer position.
    const pointFromEvent =
      Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
        ? { clientX: event.clientX, clientY: event.clientY }
        : null;

    const point =
      pointFromEvent ??
      (this.lastDragPointerPosition
        ? { clientX: this.lastDragPointerPosition.x, clientY: this.lastDragPointerPosition.y }
        : null);

    const stack =
      this.findStackElement(event) ??
      (point ? this.findStackAtPoint(point.clientX, point.clientY) : null);
    if (!stack) {
      if (this.dropJoystick.dataset['visible'] !== 'true') {
        this.hideDropIndicator();
      }
      return;
    }

    const path = this.parsePath(stack.dataset['path']);
    // While reordering within the same header, suppress the joystick/indicator entirely
    if (
      this.dragState &&
      this.dragState.floatingIndex !== null &&
      this.dragState.floatingIndex < 0 &&
      path &&
      this.pathsEqual(path, this.dragState.sourcePath)
    ) {
      const px = (point ? point.clientX : event.clientX) as number;
      const py = (point ? point.clientY : event.clientY) as number;
      if (Number.isFinite(px) && Number.isFinite(py) && this.isPointerOverSourceHeader(px, py)) {
        // Drive live reorder using the unified path so we update instantly.
        this.updatePaneDragDropTargetFromPoint(px, py);
        this.hideDropIndicator();
        return;
      }
    }
    // If the hovered stack changed, clear any sticky zone from the previous
    // target before computing the new zone.
    if (this.dropJoystickTarget && this.dropJoystickTarget !== stack) {
      delete this.dropJoystick.dataset['zone'];
      this.updateDropJoystickActiveZone(null);
    }

    const eventZoneHint = this.extractDropZoneFromEvent(event);
    const pointZoneHint = point ? this.findDropZoneByPoint(point.clientX, point.clientY) : null;
    const zone = this.computeDropZone(stack, point ?? event, pointZoneHint ?? eventZoneHint);
    this.showDropIndicator(stack, zone);
  }

  private updateDraggedFloatingPosition(event: DragEvent): void {
    if (!this.dragState) {
      return;
    }

    const { clientX, clientY } = event;
    const hasValidCoordinates =
      Number.isFinite(clientX) &&
      Number.isFinite(clientY) &&
      !(clientX === 0 && clientY === 0);

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
    // Attempt to finalize a drop even if the drop event doesn't reach us (Firefox/edge cases)
    const state = this.dragState;
    const pos = this.lastDragPointerPosition;
    if (state && pos) {
      const stack = this.findStackAtPoint(pos.x, pos.y);
      const joystickVisible = this.dropJoystick.dataset['visible'] === 'true';
      const joystickPath = this.parsePath(this.dropJoystick.dataset['path']);
      const joystickTarget = this.dropJoystickTarget;
      const joystickTargetPath = joystickTarget ? this.parsePath(joystickTarget.dataset['path']) : null;
      const path = stack ? this.parsePath(stack.dataset['path']) : (joystickPath ?? joystickTargetPath);
      const joystickZone = this.dropJoystick.dataset['zone'] as DropZone | undefined;
      const zone = this.isDropZone(joystickZone)
        ? joystickZone
        : (stack ? this.computeDropZone(stack, { clientX: pos.x, clientY: pos.y }, null) : null);
      
      if (path && this.isDropZone(zone)) {
        this.handleDrop(path, zone!);
        this.hideDropIndicator();
        if (this.dragState) {
          this.dragState.dropHandled = true;
        }
      }
    } else {
      this.hideDropIndicator();
    }

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
    // Ignore obviously bogus coordinates sometimes seen during HTML5 drag
    if (clientX === 0 && clientY === 0) {
      return;
    }

    // If still dragging a tab inside its header, only convert to floating once we leave the header.
    if (this.dragState.floatingIndex !== null && this.dragState.floatingIndex < 0) {
      const b = this.dragState.sourceHeaderBounds;
      const sx = this.dragState.startClientX ?? clientX;
      const sy = this.dragState.startClientY ?? clientY;
      const dist = Math.hypot(clientX - sx, clientY - sy);
      const threshold = 8; // pixels to move before converting (tuned up)
      // Default to inside while bounds are unknown to avoid premature floating
      let insideHeader = true;
      const insideByBounds = b ? this.isPointWithinBounds(b, clientX, clientY) : true;
      const insideByHitTest = this.isPointerOverSourceHeader(clientX, clientY);
      insideHeader = insideByBounds || insideByHitTest;
      if (!insideHeader && dist > threshold) {
        // Convert to floating now using current pointer position
        this.convertPendingTabDragToFloating(clientX, clientY);
      }
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
    const path = stack ? this.parsePath(stack.dataset['path']) : null;
    if (!stack || !path) {
      // While actively dragging, avoid hiding the indicator if it is visible.
      // Transient misses from hit-testing are common near the joystick.
      if (this.dropJoystick.dataset['visible'] !== 'true') {
        this.hideDropIndicator();
      }
      // Also ensure any in-header placeholder is cleared when not over a stack
      this.clearHeaderDragPlaceholder();
      return;
    }

    // If we moved to a different target stack, reset any sticky zone so
      // the new drop area doesn't inherit the previous side selection.
    if (this.dropJoystickTarget && this.dropJoystickTarget !== stack) {
      delete this.dropJoystick.dataset['zone'];
      this.updateDropJoystickActiveZone(null);
    }

    // Previous behavior hid the indicator and returned early here; instead,
    // allow the live-reorder branch below to handle in-header drags.

    // While dragging within the same header, show a placeholder and suppress joystick/indicator
    if (
      this.dragState &&
      this.dragState.floatingIndex !== null &&
      this.dragState.floatingIndex < 0 &&
      path &&
      this.pathsEqual(path, this.dragState.sourcePath)
    ) {
      const inHeaderByBounds = !!this.dragState.sourceHeaderBounds && this.isPointWithinBounds(this.dragState.sourceHeaderBounds, clientX, clientY);
      const inHeaderByHitTest = this.isPointerOverSourceHeader(clientX, clientY);
      if (inHeaderByBounds || inHeaderByHitTest) {
        // Ensure placeholder exists and move it as the pointer moves.
        // Placeholder management mutates the slotted children of the
        // mp-tab-control stack; the WC re-renders the strip on slotchange.
        this.ensureHeaderDragPlaceholder(stack, this.dragState.pane);
        const idx = this.computeHeaderInsertIndex(stack, clientX);
        if (this.dragState.liveReorderIndex !== idx) {
          this.updateHeaderDragPlaceholderPosition(stack, idx);
          // Keep model reordering until drop; only move the placeholder now
          this.dragState.liveReorderIndex = idx;
        }
        this.hideDropIndicator();
        return;
      }
    }

    // Leaving the header: ensure any placeholder is removed immediately
    this.clearHeaderDragPlaceholder();

    const zoneHint = this.findDropZoneByPoint(clientX, clientY);
    const zone = this.computeDropZone(stack, { clientX, clientY }, zoneHint);
    this.showDropIndicator(stack, zone);
  }

  // Returns true when the pointer is currently over the source stack's header (tab strip).
  // The strip lives inside the mp-tab-control's shadow as `.tsc`, so we test
  // bounds directly rather than using elementsFromPoint(/contains) which won't
  // pierce the shadow boundary cleanly.
  private isPointerOverSourceHeader(clientX: number, clientY: number): boolean {
    const state = this.dragState;
    if (!state) {
      return false;
    }
    const stackEl = state.sourceStackEl ?? null;
    const strip = stackEl ? this.getStackStripEl(stackEl) : null;
    if (!strip) {
      // Be conservative: if we cannot resolve the strip, treat as inside
      return true;
    }
    const r = strip.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }

  private isPointWithinBounds(
    bounds: { left: number; right: number; top: number; bottom: number },
    x: number,
    y: number,
  ): boolean {
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  // Ensure a placeholder tab exists during in-header drag and hide the real dragged tab visually.
  // Operates on the mp-tab-control stack: the dragged content div gets `data-hidden`
  // (mp-tab-control then skips its tab in the strip), and a placeholder header+content
  // pair is appended as light-DOM children of the stack. mp-tab-control's mutation
  // observer picks up the change and renders the placeholder as a tab.
  private ensureHeaderDragPlaceholder(stack: HTMLElement, pane: string): void {
    if (stack.tagName !== 'MP-TAB-CONTROL') return;
    if (this.dragState?.placeholderHeader === stack && this.dragState.placeholderEl) {
      return;
    }
    const draggedHeader = stack.querySelector<HTMLElement>(
      `:scope > .dock-tab[data-pane="${CSS.escape(pane)}"]`,
    );
    const draggedContent = stack.querySelector<HTMLElement>(
      `:scope > .dock-stack__pane[data-pane="${CSS.escape(pane)}"]`,
    );
    if (!draggedHeader || !draggedContent) return;

    // Measure the dragged tab's text-only width BEFORE hiding it. The
    // `.dock-tab` rule applies padding (matching the strip button's padding so
    // the span fills the button as a drag handle), so `offsetWidth` is
    // text + padding — we subtract the span's own padding to get just the
    // text width. That's the natural slot content width we want the
    // placeholder to reserve; the placeholder span will re-apply the same
    // padding on top, mirroring the original tab's geometry exactly.
    const draggedCS = this.windowRef
      ? this.windowRef.getComputedStyle(draggedHeader)
      : globalThis.getComputedStyle(draggedHeader);
    const draggedHorizontalPadding =
      parseFloat(draggedCS.paddingLeft) + parseFloat(draggedCS.paddingRight);
    const slotContentWidth = Math.max(
      0,
      draggedHeader.offsetWidth - draggedHorizontalPadding,
    );

    // Hide the dragged tab from mp-tab-control's strip (frees up the slot).
    draggedContent.setAttribute('data-hidden', '');

    // Build placeholder header + content. The placeholder uses a unique tabId
    // (`__dock-placeholder__`) so its slot names don't collide with real panes.
    // We mirror the dragged tab's text into the placeholder (dimmed via opacity)
    // so the strip reads as "this tab is being dragged" rather than "empty slot".
    const placeholderTabId = '__dock-placeholder__';
    const phHeader = this.documentRef.createElement('span');
    phHeader.setAttribute('slot', `${placeholderTabId}-header`);
    phHeader.classList.add('dock-tab');
    phHeader.dataset['placeholder'] = 'true';
    phHeader.dataset['tabId'] = placeholderTabId;
    phHeader.setAttribute('aria-hidden', 'true');
    phHeader.textContent = draggedHeader.textContent;
    // `display: inline-block` is required for `min-width` to take effect on the
    // span. Without it, an inline element ignores min-width and the placeholder
    // collapses to its content width (or 0 if textContent is also empty),
    // leaving a "mini-thumb" in the strip.
    phHeader.style.display = 'inline-block';
    phHeader.style.minWidth = `${slotContentWidth}px`;
    phHeader.style.opacity = '0.5';

    const phContent = this.documentRef.createElement('div');
    phContent.setAttribute('slot', `${placeholderTabId}-content`);
    phContent.classList.add('dock-stack__pane');
    phContent.dataset['placeholder'] = 'true';

    // Insert before the dragged header span so the placeholder appears in
    // the dragged tab's original strip position. The mutation observer in
    // mp-tab-control will refresh the tab list automatically.
    stack.insertBefore(phHeader, draggedHeader);
    stack.insertBefore(phContent, draggedContent);

    if (this.dragState) {
      this.dragState.placeholderHeader = stack;
      this.dragState.placeholderEl = phHeader;
    }
  }

  // Move the placeholder to the computed target index within the strip.
  // We reorder light-DOM children (header span + matching content div); the
  // mp-tab-control then re-renders the strip in the new order on slotchange.
  private updateHeaderDragPlaceholderPosition(stack: HTMLElement, targetIndex: number): void {
    if (stack.tagName !== 'MP-TAB-CONTROL') return;
    const phHeader = this.dragState?.placeholderEl ?? null;
    if (!phHeader) return;

    const draggedPane = this.dragState?.pane ?? null;
    // Find all real header spans (excluding the placeholder + the hidden dragged one).
    const realHeaders = Array.from(
      stack.querySelectorAll<HTMLElement>(':scope > .dock-tab'),
    ).filter(
      (h) =>
        h !== phHeader &&
        (!draggedPane || h.dataset['pane'] !== draggedPane),
    );
    const clampedTarget = Math.max(0, Math.min(targetIndex, realHeaders.length));
    const ref = realHeaders[clampedTarget] ?? null;
    stack.insertBefore(phHeader, ref);

    // Keep the placeholder content adjacent to its header so child-order
    // remains predictable for slotchange-driven re-renders.
    const phContent = stack.querySelector<HTMLElement>(
      `:scope > .dock-stack__pane[data-placeholder="true"]`,
    );
    if (phContent && phHeader.nextElementSibling !== phContent) {
      stack.insertBefore(phContent, phHeader.nextElementSibling);
    }
  }

  // Remove placeholder and restore the dragged tab's visibility.
  private clearHeaderDragPlaceholder(): void {
    const ph = this.dragState?.placeholderEl ?? null;
    const stack = this.dragState?.placeholderHeader ?? null;
    if (stack) {
      // Restore the dragged content div's visibility so its strip tab returns.
      if (this.dragState?.pane) {
        const draggedContent = stack.querySelector<HTMLElement>(
          `:scope > .dock-stack__pane[data-pane="${CSS.escape(this.dragState.pane)}"]`,
        );
        draggedContent?.removeAttribute('data-hidden');
      }
      // Remove the placeholder content div sibling.
      const phContent = stack.querySelector<HTMLElement>(
        `:scope > .dock-stack__pane[data-placeholder="true"]`,
      );
      phContent?.remove();
    }
    if (ph && ph.parentElement) {
      ph.parentElement.removeChild(ph);
    }
    if (this.dragState) {
      this.dragState.placeholderEl = null;
      this.dragState.placeholderHeader = null;
    }
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
    event.stopPropagation();
    this.lastDragPointerPosition = { x: touch.clientX, y: touch.clientY };
    this.updateDraggedFloatingPositionFromPoint(touch.clientX, touch.clientY);
  }

  private onDragMouseUp(): void {
    // Prefer committing a drop from pointer-up since some browsers suppress drop events
    if (this.dragState) {
      const pos = this.lastDragPointerPosition;
      if (pos) {
        this.finalizeDropFromPoint(pos.x, pos.y);
      }
    }
    this.handleDragPointerUpCommon();
  }

  // Convert a currently in-header tab drag into a floating window
  private convertPendingTabDragToFloating(clientX: number, clientY: number): void {
    if (!this.dragState) {
      return;
    }
    const state = this.dragState;
    if (state.floatingIndex !== null && state.floatingIndex >= 0) {
      return; // already floating
    }
    // Clean up any placeholder before converting
    this.clearHeaderDragPlaceholder();
    const location = this.resolveStackLocation(state.sourcePath);
    if (!location) {
      return;
    }

    const pane = state.pane;
    const stackEl = state.sourceStackEl ?? null;
    const hostRect = this.getBoundingClientRect();
    const stackRect = stackEl?.getBoundingClientRect() ?? null;
    const metrics = this.pendingTabDragMetrics;

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

    const pointerOffsetX = Number.isFinite(this.dragState?.pointerOffsetX as number)
      ? (this.dragState!.pointerOffsetX as number)
      : metrics && Number.isFinite(metrics.pointerOffsetX)
      ? (metrics.pointerOffsetX as number)
      : width / 2;
    const pointerOffsetY = Number.isFinite(this.dragState?.pointerOffsetY as number)
      ? (this.dragState!.pointerOffsetY as number)
      : metrics && Number.isFinite(metrics.pointerOffsetY)
      ? (metrics.pointerOffsetY as number)
      : height / 2;

    const pointerLeft = Number.isFinite(clientX)
      ? clientX - hostRect.left - pointerOffsetX
      : 0;
    const pointerTop = Number.isFinite(clientY)
      ? clientY - hostRect.top - pointerOffsetY
      : 0;

    // Remove pane from its current stack and create a new floating entry
    this.removePaneFromLocation(location, pane);
    const floatingStack: DockStackNode = {
      kind: 'stack',
      panes: [pane],
      activePane: pane,
    };

    const floatingLayout: DockFloatingStackLayout = {
      bounds: {
        left: pointerLeft,
        top: pointerTop,
        width,
        height,
      },
      root: floatingStack,
      activePane: pane,
    };

    this.floatingLayouts.push(floatingLayout);
    const newIndex = this.floatingLayouts.length - 1;
    this.renderLayout();
    const wrapper = this.getFloatingWrapper(newIndex);
    if (wrapper) {
      this.promoteFloatingPane(newIndex, wrapper);
    }
    // Update drag state so subsequent moves reposition the floating window
    state.sourcePath = { type: 'floating', index: newIndex, segments: [] };
    state.floatingIndex = newIndex;
    state.pointerOffsetX = pointerOffsetX;
    state.pointerOffsetY = pointerOffsetY;
    this.dispatchLayoutChanged();
  }

  // Compute the intended tab insert index within a stack's strip based on pointer X.
  // Uses the rendered tab buttons inside mp-tab-control's shadow strip for geometry;
  // the dragged tab is hidden during drag (its content has data-hidden), and the
  // placeholder button (if present) gives us the dragged-position reference.
  private computeHeaderInsertIndex(stack: HTMLElement, clientX: number): number {
    if (stack.tagName !== 'MP-TAB-CONTROL') return 0;
    const allTabButtons = this.getStackTabButtons(stack);
    if (allTabButtons.length === 0) {
      return 0;
    }

    const placeholderHeader = stack.querySelector<HTMLElement>(
      ':scope > .dock-tab[data-placeholder="true"]',
    );
    const placeholderTabId = placeholderHeader?.dataset['tabId'];
    const placeholderButton = placeholderTabId
      ? allTabButtons.find((b) => b.id === `${placeholderTabId}-header-button`) ?? null
      : null;

    const targets = allTabButtons.filter((b) => b !== placeholderButton);
    if (targets.length === 0) {
      return 0;
    }

    const rightBias = 12;
    const leftBias = 0;

    const baseRect = placeholderButton ? placeholderButton.getBoundingClientRect() : null;
    const rectValid = !!baseRect && Number.isFinite(baseRect.width) && baseRect.width > 0;
    const draggedCenter = rectValid && baseRect ? baseRect.left + baseRect.width / 2 : null;

    for (let i = 0; i < targets.length; i += 1) {
      const rect = targets[i].getBoundingClientRect();
      const baseMid = rect.left + rect.width / 2;
      const isRightOfDragged = draggedCenter !== null ? baseMid >= draggedCenter : false;
      const mid = isRightOfDragged ? baseMid + rightBias : baseMid - leftBias;
      if (clientX < mid) {
        return i;
      }
    }
    return targets.length;
  }

  private reorderPaneInLocationAtIndex(location: ResolvedLocation, pane: string, targetIndex: number): void {
    const panes = location.node.panes;
    const currentIndex = panes.indexOf(pane);
    if (currentIndex === -1) {
      return;
    }
    const clampedTarget = Math.max(0, Math.min(targetIndex, panes.length - 1));
    if (clampedTarget === currentIndex) {
      return;
    }
    panes.splice(currentIndex, 1);
    panes.splice(clampedTarget, 0, pane);
    location.node.activePane = pane;
    if (location.context === 'floating') {
      const floating = this.floatingLayouts[location.index];
      if (floating) {
        floating.activePane = pane;
      }
    }
  }

  private onDragTouchEnd(): void {
    this.handleDragPointerUpCommon();
  }

  // Commit a drop using current pointer coordinates and joystick state
  private finalizeDropFromPoint(clientX: number, clientY: number): void {
    if (!this.dragState) {
      return;
    }
    const stack = this.findStackAtPoint(clientX, clientY);
    const stackPath = stack ? this.parsePath(stack.dataset['path']) : null;
    const joystickVisible = this.dropJoystick.dataset['visible'] === 'true';
    const joystickStoredPath = this.parsePath(this.dropJoystick.dataset['path']);
    const joystickTarget = this.dropJoystickTarget;
    const joystickTargetPath = joystickTarget ? this.parsePath(joystickTarget.dataset['path']) : null;
    const path = (joystickVisible ? (joystickStoredPath ?? joystickTargetPath) : null) ?? stackPath;

    const joystickZone = this.dropJoystick.dataset['zone'] as DropZone | undefined;
    const zone: DropZone | null = this.isDropZone(joystickZone)
      ? joystickZone
      : (stack ? this.computeDropZone(stack, { clientX, clientY }, null) : null);

    // Same-header reorder case when no side zone is chosen
    if (
      this.dragState &&
      this.dragState.floatingIndex !== null &&
      this.dragState.floatingIndex < 0 &&
      stack &&
      path &&
      stackPath &&
      this.pathsEqual(stackPath, this.dragState.sourcePath) &&
      (!zone || zone === 'center')
    ) {
      const location = this.resolveStackLocation(path);
      if (location) {
        const idx = this.computeHeaderInsertIndex(stack, clientX);
        this.reorderPaneInLocationAtIndex(location, this.dragState.pane, idx);
        this.renderLayout();
        this.dispatchLayoutChanged();
        this.dragState.dropHandled = true;
        return;
      }
    }

    if (path && this.isDropZone(zone)) {
      this.handleDrop(path, zone!);
      this.dragState.dropHandled = true;
    }
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

    // Prefer joystick's stored target path when the joystick is visible (drop over buttons)
    const joystickVisible = this.dropJoystick.dataset['visible'] === 'true';
    const joystickPath = this.parsePath(this.dropJoystick.dataset['path']);
    const joystickTarget = this.dropJoystickTarget;
    const joystickTargetPath = joystickTarget ? this.parsePath(joystickTarget.dataset['path']) : null;
    let path = stack
      ? this.parsePath(stack.dataset['path'])
      : (joystickPath ?? joystickTargetPath);
    if (!path && joystickVisible) {
      // As a last resort, target the main dock surface only when empty
      const dockPath = this.parsePath(this.dockedEl.dataset['path']);
      path = (!this.rootLayout ? dockPath : null);
    }

    // Defer same-header reorder decision until after zone resolution below

    // Prefer joystick's active zone if available, else infer from event/point
    const joystickZone = this.dropJoystick.dataset['zone'] as DropZone | undefined;
    const eventZoneHint = this.extractDropZoneFromEvent(event);
    const pointZoneHint = point ? this.findDropZoneByPoint(point.clientX, point.clientY) : null;
    const zone = this.isDropZone(joystickZone)
      ? joystickZone
      : stack
      ? this.computeDropZone(stack, point ?? event, pointZoneHint ?? eventZoneHint)
      : (this.isDropZone(pointZoneHint ?? eventZoneHint) ? (pointZoneHint ?? eventZoneHint) : null);

    
    // If still in same header and no side zone chosen, treat as in-header reorder
    if (
      this.dragState &&
      this.dragState.floatingIndex !== null &&
      this.dragState.floatingIndex < 0 &&
      stack &&
      path &&
      this.pathsEqual(path, this.dragState.sourcePath) &&
      (!zone || zone === 'center')
    ) {
      const x = (point ? point.clientX : event.clientX) as number;
      if (Number.isFinite(x)) {
        const location = this.resolveStackLocation(path);
        if (location) {
          const idx = this.computeHeaderInsertIndex(stack, x);
          this.reorderPaneInLocationAtIndex(location, this.dragState.pane, idx);
          this.renderLayout();
          this.dispatchLayoutChanged();
          this.dragState.dropHandled = true;
          this.endPaneDrag();
          return;
        }
      }
    }
    // If joystick is visible and both path and zone are resolved, force using joystick as authoritative
    if (joystickVisible && path && this.isDropZone(joystickZone)) {
      this.handleDrop(path, joystickZone);
      this.endPaneDrag();
      return;
    }
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

    // During active drags, browsers can emit spurious dragleave with null
    // relatedTarget while the pointer is still over the joystick/buttons.
    // Be conservative: if we can resolve a stack/joystick at the last known
    // pointer position, don’t hide (prevents flicker of active state).
    if (this.dragState) {
      const pos =
        (Number.isFinite((event as DragEvent).clientX) && Number.isFinite((event as DragEvent).clientY))
          ? { x: (event as DragEvent).clientX, y: (event as DragEvent).clientY }
          : this.lastDragPointerPosition;
      if (pos) {
        const stackAtPoint = this.findStackAtPoint(pos.x, pos.y);
        if (stackAtPoint) {
          return; // still inside our drop area; ignore this dragleave
        }
      }
    }

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

    // Special case: allow dropping onto an empty main dock area (no root).
    if (!target && targetPath.type === 'docked' && !this.rootLayout) {
      if (!source) {
        return;
      }
      const stackEmptied = this.removePaneFromLocation(source, pane, true);
      const newRoot: DockStackNode = {
        kind: 'stack',
        panes: [pane],
        activePane: pane,
      };
      this.rootLayout = newRoot;
      if (stackEmptied) {
        this.cleanupLocation(source);
      }
      this.renderLayout();
      this.dispatchLayoutChanged();
      if (this.dragState) {
        this.dragState.dropHandled = true;
      }
      return;
    }

    if (!source || !target) {
      return;
    }

    if (zone === 'center' && this.pathsEqual(sourcePath, targetPath)) {
      if (!source.node.panes.includes(pane)) {
        return;
      }
      this.reorderPaneInLocation(source, pane);
      this.renderLayout();
      this.dispatchLayoutChanged();
      if (this.dragState) {
        this.dragState.dropHandled = true;
      }
      return;
    }

    const stackEmptied = this.removePaneFromLocation(source, pane, true);

    if (zone === 'center') {
      this.addPaneToLocation(target, pane);
      this.setActivePaneForLocation(target, pane);
      if (stackEmptied) {
        this.cleanupLocation(source);
      }
      this.renderLayout();
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

    if (target.context === 'docked') {
      this.rootLayout = this.dockNodeBeside(this.rootLayout, target.node, newStack, zone);
    } else {
      const floating = this.floatingLayouts[target.index];
      if (!floating) {
        if (stackEmptied) {
          this.cleanupLocation(source);
        }
        this.renderLayout();
        this.dispatchLayoutChanged();
        return;
      }

      floating.root = this.dockNodeBeside(floating.root, target.node, newStack, zone);
      floating.activePane = pane;
    }

    if (stackEmptied) {
      this.cleanupLocation(source);
    }

    this.renderLayout();
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
    // Allow dropping an entire floating stack onto an empty main dock area
    // (no existing root).
    if (!target && targetPath.type === 'docked' && !this.rootLayout) {
      this.rootLayout = this.cloneLayoutNode(source.root);
      this.removeFloatingAt(sourceIndex);
      this.renderLayout();
      this.dispatchLayoutChanged();
      return true;
    }
    if (!target) {
      return false;
    }

    if (target.context === 'floating' && target.index === sourceIndex) {
      return false;
    }

    if (zone === 'center') {
      const panes = this.collectPaneNames(source.root);
      if (panes.length === 0) {
        return false;
      }

      panes.forEach((pane) => {
        this.addPaneToLocation(target, pane);
      });

      const activePane =
        source.activePane && panes.includes(source.activePane)
          ? source.activePane
          : this.findFirstPaneName(source.root) ?? panes[0];

      if (activePane) {
        this.setActivePaneForLocation(target, activePane);
      }

      this.removeFloatingAt(sourceIndex);
      this.renderLayout();
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
      this.renderLayout();
      this.dispatchLayoutChanged();
      return true;
    }

    this.rootLayout = this.dockNodeBeside(this.rootLayout, target.node, source.root, zone);
    this.removeFloatingAt(sourceIndex);
    this.renderLayout();
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
    // Do not force a zone: even when the main area is empty we only
    // activate a zone when the pointer is actually over a joystick button.
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
      // Be sticky while hovering the joystick: if we recently had a zone
      // selected, prefer keeping it instead of briefly clearing to null
      // when the browser reports transient coordinates/targets during drag.
      const sticky = this.dropJoystick.dataset['zone'];
      if (this.isDropZone(sticky)) {
        this.updateDropJoystickActiveZone(sticky);
        return sticky;
      }
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
      const zone = this.findDropZoneInTargets(path);
      if (zone) {
        return zone;
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

  private handleDragPointerUpCommon(): void {
    if (!this.dragState) {
      this.stopDragPointerTracking();
      return;
    }
    this.scheduleDeferredDragEnd();
  }

  private findDropZoneInTargets(targets: Iterable<EventTarget>): DropZone | null {
    for (const target of targets) {
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
      // Skip hidden/inactive buttons (used in center-only mode)
      if ((button.dataset['hidden'] === 'true') || button.style.visibility === 'hidden' || button.style.display === 'none') {
        continue;
      }
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
    // If no zone is computed but the joystick is visible, keep the last
    // known active zone to avoid visual jitter while dragging across
    // small gaps where hit‑testing momentarily fails.
    const visible = this.dropJoystick.dataset['visible'] === 'true';
    const sticky = visible ? this.dropJoystick.dataset['zone'] : undefined;
    const effectiveZone: DropZone | null = zone ?? (this.isDropZone(sticky) ? sticky : null);

    this.dropJoystickButtons.forEach((button) => {
      const isActive = effectiveZone !== null && button.dataset['zone'] === effectiveZone;
      if (isActive) {
        button.dataset['active'] = 'true';
      } else {
        delete button.dataset['active'];
      }
    });
    if (effectiveZone) {
      this.dropJoystick.dataset['zone'] = effectiveZone;
    } else {
      delete this.dropJoystick.dataset['zone'];
    }
  }

  private isDropZone(value: string | null | undefined): value is DropZone {
    return value === 'left' || value === 'right' || value === 'top' || value === 'bottom' || value === 'center';
  }

  private showDropIndicator(stack: HTMLElement, zone: DropZone | null): void {
    const targetPath = this.parsePath(stack.dataset['path']);
    const sourcePath = this.dragState?.sourcePath ?? null;
    if (targetPath && sourcePath && this.isOrIsAncestorOf(targetPath, sourcePath)) {
      // Don't show any drop indicators on the pane being dragged.
      return;
    }

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
    this.dropJoystick.style.display = 'grid';
    joystick.dataset['path'] = stack.dataset['path'] ?? '';
    const changedTarget = this.dropJoystickTarget && this.dropJoystickTarget !== stack;
    this.dropJoystickTarget = stack;
    if (changedTarget) {
      // New target stack: forget any previously sticky zone.
      delete this.dropJoystick.dataset['zone'];
    }

    // If main dock area is empty, show only the center button and collapse the grid
    const isEmptyMainArea = !this.rootLayout && (stack === this.dockedEl || (targetPath && targetPath.type === 'docked' && targetPath.segments.length === 0));
    const spacers = Array.from(this.dropJoystick.querySelectorAll<HTMLElement>('.dock-drop-joystick__spacer'));
    if (isEmptyMainArea) {
      // Keep spacers visible so the joystick keeps its circular footprint.
      spacers.forEach((s) => {
        s.style.display = '';
      });
      this.dropJoystickButtons.forEach((btn) => {
        const isCenter = btn.dataset['zone'] === 'center';
        if (isCenter) {
          btn.style.visibility = '';
          btn.style.pointerEvents = '';
          delete btn.dataset['hidden'];
          btn.style.display = '';
        } else {
          // Hide visually but keep layout space; also prevent interaction.
          btn.style.visibility = 'hidden';
          btn.style.pointerEvents = 'none';
          btn.dataset['hidden'] = 'true';
          btn.style.display = '';
        }
      });
      // Keep default 3x3 grid so the circular background size stays the same.
      this.dropJoystick.style.gridTemplateColumns = '';
      this.dropJoystick.style.gridTemplateRows = '';
      // Do not set an active zone automatically; users must hover the button.
    } else {
      this.dropJoystickButtons.forEach((btn) => {
        btn.style.visibility = '';
        btn.style.pointerEvents = '';
        delete btn.dataset['hidden'];
        btn.style.display = '';
      });
      spacers.forEach((s) => (s.style.display = ''));
      this.dropJoystick.style.gridTemplateColumns = '';
      this.dropJoystick.style.gridTemplateRows = '';
    }
    this.updateDropJoystickActiveZone(zone);
  }

  private hideDropIndicator(): void {
    this.dropIndicator.dataset['visible'] = 'false';
    this.dropJoystick.dataset['visible'] = 'false';
    this.dropJoystick.style.display = 'none';
    delete this.dropJoystick.dataset['path'];
    this.dropJoystickTarget = null;
    this.updateDropJoystickActiveZone(null);
    // Restore joystick structure to default.
    this.dropJoystickButtons.forEach((btn) => {
      btn.style.display = '';
      btn.style.visibility = '';
      btn.style.pointerEvents = '';
      delete btn.dataset['hidden'];
    });
    Array.from(this.dropJoystick.querySelectorAll<HTMLElement>('.dock-drop-joystick__spacer')).forEach((s) => (s.style.display = ''));
    this.dropJoystick.style.gridTemplateColumns = '';
    this.dropJoystick.style.gridTemplateRows = '';
  }

  private findStackAtPoint(clientX: number, clientY: number): HTMLElement | null {
    const shadow = this.shadowRoot;
    if (!shadow) {
      return null;
    }

    const elements = shadow.elementsFromPoint(clientX, clientY);
    const stack = this.findStackInTargets(elements);
    if (stack) {
      return stack;
    }
    // If there are no docked stacks (all panes are floating), allow the
    // docked surface itself to serve as a drop target for the main zone.
    if (!this.rootLayout) {
      const dockRect = this.dockedEl.getBoundingClientRect();
      if (
        clientX >= dockRect.left &&
        clientX <= dockRect.right &&
        clientY >= dockRect.top &&
        clientY <= dockRect.bottom
      ) {
        return this.dockedEl;
      }
    }

    return null;
  }

  private findStackElement(event: DragEvent): HTMLElement | null {
    const path = event.composedPath();
    const stack = this.findStackInTargets(path);
    if (stack) {
      return stack;
    }

    // If the root dock area is empty, treat the docked surface as a valid
    // target when it appears in the composed path.
    if (!this.rootLayout) {
      for (const target of path) {
        if (
          target instanceof HTMLElement &&
          (target === this.dockedEl || target.classList.contains('dock-docked'))
        ) {
          return this.dockedEl;
        }
      }
    }
    return null;
  }

  private findStackInTargets(targets: Iterable<EventTarget>): HTMLElement | null {
    for (const element of targets) {
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

  private activatePane(stack: HTMLElement, paneName: string, path: DockPath): void {
    stack.dataset['activePane'] = paneName;

    // Reflect to mp-tab-control's `active-tab` attribute. The WC handles
    // strip button styling (active class, aria-selected) + body-slot
    // projection automatically via the named-slot pattern.
    if (stack.tagName === 'MP-TAB-CONTROL') {
      const headerSpan = stack.querySelector<HTMLElement>(
        `:scope > .dock-tab[data-pane="${CSS.escape(paneName)}"]`,
      );
      const tabId = headerSpan?.dataset['tabId'];
      if (tabId) {
        stack.setAttribute('active-tab', tabId);
      }
    }

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
    // Deprecated method retained temporarily for signature compatibility.
    // Use collectPaneNames instead.
    const panes = this.collectPaneNames(node);
    const titles: Record<string, string> = {};
    panes.forEach((p) => {
      const t = this.titles[p];
      if (t) {
        titles[p] = t;
      }
    });
    return { panes, titles };
  }

  private collectPaneNames(node: DockLayoutNode | null): string[] {
    const panes: string[] = [];
    this.forEachStack(node, (stack) => {
      stack.panes.forEach((pane) => panes.push(pane));
    });
    return panes;
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

    const root = layout.root ? this.cloneLayoutNode(layout.root) : null;

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

  private isOrIsAncestorOf(ancestor: DockPath, descendant: DockPath): boolean {
    if (ancestor.type !== descendant.type) {
      return false;
    }

    if (ancestor.type === 'floating') {
      if ((descendant as any).index !== ancestor.index) {
        return false;
      }
    }

    if (ancestor.segments.length > descendant.segments.length) {
      return false;
    }

    return ancestor.segments.every((segment, i) => segment === descendant.segments[i]);
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

