import { Component, ContentChildren, Input, OnDestroy, HostBinding, ElementRef, QueryList } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockLayout } from '../interfaces/dock-layout';
import { BsTabGroupPane } from '../panes/tab-group-pane';
import { BsContentPane } from '../panes/content-pane';
import { BsFloatingPane } from '../panes/floating-pane';
import { BsSplitPane } from '../panes/split-pane';
import { BsDockPaneRendererComponent } from '../dock-pane-renderer/dock-pane-renderer.component';
import { BsDockPane } from '../panes/dock-pane';
import { BsDocumentHost } from '../panes/document-host-pane';

@Component({
  selector: 'bs-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss'],
  standalone: false,
})
export class BsDockComponent implements OnDestroy {
  constructor(private host: ElementRef<HTMLElement>) {
    this.layout$ = new BehaviorSubject<BsDockLayout>({
      rootPane: new BsTabGroupPane({ panes: [] }),
      floatingPanes: []
    });
  }

  //#region Panels
  panels$ = new BehaviorSubject<BsDockPanelComponent[]>([]);
  @ContentChildren(BsDockPanelComponent) set panels(value: QueryList<BsDockPanelComponent>) {
    this.panels$.next(value.toArray());
  }
  //#endregion
  //#region Layout
  layout$: BehaviorSubject<BsDockLayout>;
  public get layout() {
    return this.layout$.value;
  }
  @Input() public set layout(value: BsDockLayout) {
    this.layout$.next(value);
  }
  //#endregion

  @HostBinding('class.position-absolute')
  positionAbsolute = true;

  @HostBinding('style.top')
  @HostBinding('style.left')
  @HostBinding('style.bottom')
  @HostBinding('style.right')
  positionPx = 0;

  dropIndicator$ = new BehaviorSubject<DockDropIndicator | null>(null);

  private registeredRenderers = new Map<BsDockPane, RegisteredRenderer>();
  private activeDrag?: DockDragState;

  ngOnDestroy() {
  }

  public registerRenderer(pane: BsDockPane, renderer: BsDockPaneRendererComponent, element: HTMLElement) {
    this.registeredRenderers.set(pane, { renderer, element });
    if (this.activeDrag) {
      this.refreshDropTargetsAsync();
    }
  }

  public unregisterRenderer(pane: BsDockPane, renderer: BsDockPaneRendererComponent) {
    const entry = this.registeredRenderers.get(pane);
    if (entry && entry.renderer === renderer) {
      this.registeredRenderers.delete(pane);
    }
    if (this.activeDrag) {
      this.refreshDropTargetsAsync();
    }
  }

  public beginDrag(panel: BsDockPanelComponent, headerElement: HTMLElement, ev: MouseEvent) {
    if (this.activeDrag) {
      return false;
    }

    const origin = this.computeDragOrigin(headerElement, ev);
    const removal = this.removePanel(panel);
    if (!removal) {
      return false;
    }

    const floatingPane = new BsFloatingPane({
      pane: new BsTabGroupPane({ panes: [removal.contentPane] }),
      size: {
        width: origin.width,
        height: origin.height,
      },
      location: {
        x: origin.left,
        y: origin.top,
      }
    });

    const layout = this.layout$.value;
    layout.floatingPanes.push(floatingPane);
    this.layout$.next(layout);

    const dropTargets = this.collectDropTargets();

    this.activeDrag = {
      panel,
      floatingPane,
      draggedPane: removal.contentPane,
      offsetX: ev.offsetX,
      offsetY: ev.offsetY,
      dropTargets,
    };

    this.dropIndicator$.next(null);
    this.refreshDropTargetsAsync();

    return true;
  }

  public updateDrag(ev: MouseEvent) {
    if (!this.activeDrag) {
      return;
    }

    const layout = this.layout$.value;
    this.activeDrag.pointerPosition = { x: ev.clientX, y: ev.clientY };
    this.activeDrag.floatingPane.location = {
      x: ev.clientX - this.activeDrag.offsetX,
      y: ev.clientY - this.activeDrag.offsetY,
    };
    this.layout$.next(layout);

    const target = this.findDropZoneAtPoint(this.activeDrag.pointerPosition, this.activeDrag.dropTargets);
    this.activeDrag.currentTarget = target ?? undefined;
    this.updateIndicator(target ?? null);
  }

  public completeDrag(ev: MouseEvent) {
    if (!this.activeDrag) {
      return;
    }

    this.activeDrag.pointerPosition = { x: ev.clientX, y: ev.clientY };

    if (this.activeDrag.currentTarget) {
      this.applyDropTarget(this.activeDrag, this.activeDrag.currentTarget);
    } else {
      this.activeDrag.floatingPane.location = {
        x: ev.clientX - this.activeDrag.offsetX,
        y: ev.clientY - this.activeDrag.offsetY,
      };
    }

    this.dropIndicator$.next(null);
    this.activeDrag = undefined;
    this.layout$.next(this.layout$.value);
  }

  public cancelDrag() {
    this.dropIndicator$.next(null);
    this.activeDrag = undefined;
  }

  private computeDragOrigin(headerElement: HTMLElement, ev: MouseEvent) {
    let container: HTMLElement | null = headerElement;
    while (container && container.tagName.toUpperCase() !== 'BS-TAB-CONTROL') {
      container = container.parentElement;
    }

    const fallback = headerElement.parentElement as HTMLElement | null;
    const host = container ?? fallback ?? headerElement;
    const rect = host.getBoundingClientRect();

    return {
      width: rect.width || 240,
      height: rect.height || 160,
      left: ev.clientX - ev.offsetX,
      top: ev.clientY - ev.offsetY,
    };
  }

  private applyDropTarget(state: DockDragState, zone: DockDropZone) {
    const layout = this.layout$.value;

    const floatingIndex = layout.floatingPanes.indexOf(state.floatingPane);
    if (floatingIndex > -1) {
      layout.floatingPanes.splice(floatingIndex, 1);
    }

    if (state.floatingPane.pane instanceof BsTabGroupPane) {
      const floatingTabIndex = state.floatingPane.pane.panes.indexOf(state.draggedPane);
      if (floatingTabIndex > -1) {
        state.floatingPane.pane.panes.splice(floatingTabIndex, 1);
      }
    }

    const targetPane = zone.pane;
    const parent = zone.path.length > 1 ? zone.path[zone.path.length - 2] : null;

    if (zone.zone === 'center') {
      targetPane.panes.push(state.draggedPane);
      return;
    }

    const orientation: 'horizontal' | 'vertical' = (zone.zone === 'left' || zone.zone === 'right') ? 'horizontal' : 'vertical';
    const newTabGroup = new BsTabGroupPane({ panes: [state.draggedPane] });

    if ((parent instanceof BsSplitPane) && (parent.orientation === orientation)) {
      const currentIndex = parent.panes.indexOf(targetPane);
      const insertIndex = (zone.zone === 'left' || zone.zone === 'top') ? currentIndex : currentIndex + 1;
      parent.panes.splice(insertIndex, 0, newTabGroup);
    } else {
      const newSplit = new BsSplitPane({
        orientation,
        panes: [],
      });

      if (zone.zone === 'left' || zone.zone === 'top') {
        newSplit.panes = [newTabGroup, targetPane];
      } else {
        newSplit.panes = [targetPane, newTabGroup];
      }

      this.replacePaneInParent(layout, targetPane, newSplit, parent);
    }
  }

  private updateIndicator(zone: DockDropZone | null) {
    if (!zone) {
      this.dropIndicator$.next(null);
      return;
    }

    const hostRect = this.host.nativeElement.getBoundingClientRect();
    this.dropIndicator$.next({
      left: zone.rect.left - hostRect.left,
      top: zone.rect.top - hostRect.top,
      width: zone.rect.width,
      height: zone.rect.height,
    });
  }

  private refreshDropTargetsAsync() {
    if (!this.activeDrag) {
      return;
    }

    const callback = () => {
      if (!this.activeDrag) {
        return;
      }

      this.activeDrag.dropTargets = this.collectDropTargets();

      if (this.activeDrag.pointerPosition) {
        const target = this.findDropZoneAtPoint(this.activeDrag.pointerPosition, this.activeDrag.dropTargets);
        this.activeDrag.currentTarget = target ?? undefined;
        this.updateIndicator(target ?? null);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback);
    } else {
      setTimeout(callback, 0);
    }
  }

  private findDropZoneAtPoint(point: { x: number; y: number; } | undefined, zones: DockDropZone[]) {
    if (!point) {
      return null;
    }

    for (const zone of zones) {
      if (this.pointInRect(point, zone.rect)) {
        return zone;
      }
    }

    return null;
  }

  private pointInRect(point: { x: number; y: number; }, rect: Rect) {
    return (point.x >= rect.left) && (point.x <= rect.right) && (point.y >= rect.top) && (point.y <= rect.bottom);
  }

  private collectDropTargets() {
    const zones: DockDropZone[] = [];

    for (const [pane, entry] of this.registeredRenderers.entries()) {
      if (!(pane instanceof BsTabGroupPane)) {
        continue;
      }

      const rect = entry.element.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        continue;
      }

      const path = this.findPanePathForPane(pane);
      if (!path) {
        continue;
      }

      const leftRect = this.createDropRect(rect, 'left');
      const rightRect = this.createDropRect(rect, 'right');
      const topRect = this.createDropRect(rect, 'top');
      const bottomRect = this.createDropRect(rect, 'bottom');
      const centerRect = this.createDropRect(rect, 'center');

      if (leftRect) {
        zones.push({ pane, path, rect: leftRect, zone: 'left' });
      }
      if (rightRect) {
        zones.push({ pane, path, rect: rightRect, zone: 'right' });
      }
      if (topRect) {
        zones.push({ pane, path, rect: topRect, zone: 'top' });
      }
      if (bottomRect) {
        zones.push({ pane, path, rect: bottomRect, zone: 'bottom' });
      }
      if (centerRect) {
        zones.push({ pane, path, rect: centerRect, zone: 'center' });
      }
    }

    return zones;
  }

  private createDropRect(baseRect: DOMRect, zone: DockZonePlacement): Rect | null {
    const minSize = 24;

    switch (zone) {
      case 'center': {
        const width = Math.max(Math.min(baseRect.width * 0.5, baseRect.width), minSize);
        const height = Math.max(Math.min(baseRect.height * 0.5, baseRect.height), minSize);
        const left = baseRect.left + (baseRect.width - width) / 2;
        const top = baseRect.top + (baseRect.height - height) / 2;
        return this.buildRect(left, top, width, height);
      }
      case 'left': {
        const width = Math.min(Math.max(baseRect.width * 0.25, minSize), baseRect.width);
        return this.buildRect(baseRect.left, baseRect.top, width, baseRect.height);
      }
      case 'right': {
        const width = Math.min(Math.max(baseRect.width * 0.25, minSize), baseRect.width);
        const left = baseRect.right - width;
        return this.buildRect(left, baseRect.top, width, baseRect.height);
      }
      case 'top': {
        const height = Math.min(Math.max(baseRect.height * 0.25, minSize), baseRect.height);
        return this.buildRect(baseRect.left, baseRect.top, baseRect.width, height);
      }
      case 'bottom': {
        const height = Math.min(Math.max(baseRect.height * 0.25, minSize), baseRect.height);
        const top = baseRect.bottom - height;
        return this.buildRect(baseRect.left, top, baseRect.width, height);
      }
      default:
        return null;
    }
  }

  private buildRect(left: number, top: number, width: number, height: number): Rect {
    const clampedWidth = Math.max(width, 1);
    const clampedHeight = Math.max(height, 1);
    return {
      left,
      top,
      width: clampedWidth,
      height: clampedHeight,
      right: left + clampedWidth,
      bottom: top + clampedHeight,
    };
  }

  private findPanePathForPane(target: BsDockPane) {
    const layout = this.layout$.value;

    const rootPath = this.findPanePathToTarget(layout.rootPane, target);
    if (rootPath) {
      return rootPath;
    }

    for (const floating of layout.floatingPanes) {
      const floatingPath = this.findPanePathToTarget(floating, target);
      if (floatingPath) {
        return floatingPath;
      }
    }

    return null;
  }

  private findPanePathToTarget(current: BsDockPane | undefined, target: BsDockPane): BsDockPane[] | null {
    if (!current) {
      return null;
    }

    if (current === target) {
      return [current];
    }

    if (current instanceof BsSplitPane) {
      for (const pane of current.panes) {
        const path = this.findPanePathToTarget(pane, target);
        if (path) {
          return [current, ...path];
        }
      }
    } else if (current instanceof BsTabGroupPane) {
      for (const pane of current.panes) {
        const path = this.findPanePathToTarget(pane, target);
        if (path) {
          return [current, ...path];
        }
      }
    } else if (current instanceof BsFloatingPane) {
      const path = this.findPanePathToTarget(current.pane, target);
      if (path) {
        return [current, ...path];
      }
    } else if (current instanceof BsDocumentHost) {
      const path = this.findPanePathToTarget(current.rootPane, target);
      if (path) {
        return [current, ...path];
      }
    }

    return null;
  }

  private removePanel(panel: BsDockPanelComponent): RemovedPanel | null {
    const layout = this.layout$.value;
    const pathInfo = this.findContentPanePath(panel);
    if (!pathInfo) {
      return null;
    }

    const path = pathInfo.path;
    const contentPane = path[path.length - 1];

    if (!(contentPane instanceof BsContentPane)) {
      return null;
    }

    const parent = path.length > 1 ? path[path.length - 2] : null;
    if (!(parent instanceof BsTabGroupPane)) {
      return null;
    }

    const index = parent.panes.indexOf(contentPane);
    if (index === -1) {
      return null;
    }

    parent.panes.splice(index, 1);

    this.cleanupAfterRemoval(layout, path);

    if (pathInfo.floatingHost) {
      const floatingIndex = layout.floatingPanes.indexOf(pathInfo.floatingHost);
      if (floatingIndex > -1 && (!pathInfo.floatingHost.pane || pathInfo.floatingHost.pane.isEmpty)) {
        layout.floatingPanes.splice(floatingIndex, 1);
      }
    }

    return { contentPane };
  }

  private cleanupAfterRemoval(layout: BsDockLayout, path: BsDockPane[]) {
    for (let i = path.length - 1; i >= 0; i--) {
      const pane = path[i];
      const parent = i > 0 ? path[i - 1] : null;

      if (pane instanceof BsContentPane) {
        continue;
      } else if (pane instanceof BsTabGroupPane) {
        if (pane.panes.length === 0) {
          this.removePaneFromParent(layout, pane, parent);
        }
      } else if (pane instanceof BsSplitPane) {
        if (pane.panes.length === 0) {
          this.removePaneFromParent(layout, pane, parent);
        } else if (pane.panes.length === 1) {
          this.replacePaneInParent(layout, pane, pane.panes[0], parent);
        }
      } else if (pane instanceof BsFloatingPane) {
        if (!pane.pane || pane.pane.isEmpty) {
          const floatingIndex = layout.floatingPanes.indexOf(pane);
          if (floatingIndex > -1) {
            layout.floatingPanes.splice(floatingIndex, 1);
          }
        }
      } else if (pane instanceof BsDocumentHost) {
        if (!pane.rootPane) {
          if (parent) {
            this.removePaneFromParent(layout, pane, parent);
          } else {
            pane.rootPane = new BsTabGroupPane({ panes: [] });
          }
        }
      }
    }

    if (!layout.rootPane) {
      layout.rootPane = new BsTabGroupPane({ panes: [] });
    }
  }

  private removePaneFromParent(layout: BsDockLayout, pane: BsDockPane, parent: BsDockPane | null) {
    if (!parent) {
      layout.rootPane = new BsTabGroupPane({ panes: [] });
      return;
    }

    if (parent instanceof BsSplitPane) {
      const index = parent.panes.indexOf(pane);
      if (index > -1) {
        parent.panes.splice(index, 1);
      }
    } else if (parent instanceof BsDocumentHost) {
      if (parent.rootPane === pane) {
        parent.rootPane = undefined;
      }
    } else if (parent instanceof BsFloatingPane) {
      if (parent.pane === pane) {
        parent.pane = undefined;
      }
    }
  }

  private replacePaneInParent(layout: BsDockLayout, target: BsDockPane, replacement: BsDockPane, parent: BsDockPane | null) {
    if (!parent) {
      layout.rootPane = replacement;
      return;
    }

    if (parent instanceof BsSplitPane) {
      const index = parent.panes.indexOf(target);
      if (index > -1) {
        parent.panes.splice(index, 1, replacement);
      }
    } else if (parent instanceof BsDocumentHost) {
      if (parent.rootPane === target) {
        parent.rootPane = replacement;
      }
    } else if (parent instanceof BsFloatingPane) {
      if (parent.pane === target) {
        parent.pane = replacement;
      }
    } else {
      throw new Error('Unsupported parent type for replacement');
    }
  }

  private findContentPanePath(panel: BsDockPanelComponent) {
    const layout = this.layout$.value;
    const rootPath = this.findContentPanePathRecursive(layout.rootPane, panel);
    if (rootPath) {
      return { path: rootPath };
    }

    for (const floating of layout.floatingPanes) {
      const floatingPath = this.findContentPanePathRecursive(floating, panel);
      if (floatingPath) {
        return { path: floatingPath, floatingHost: floating };
      }
    }

    return null;
  }

  private findContentPanePathRecursive(current: BsDockPane | undefined, panel: BsDockPanelComponent): BsDockPane[] | null {
    if (!current) {
      return null;
    }

    if (current instanceof BsContentPane) {
      return current.dockPanel === panel ? [current] : null;
    }

    if (current instanceof BsTabGroupPane) {
      for (const pane of current.panes) {
        const path = this.findContentPanePathRecursive(pane, panel);
        if (path) {
          return [current, ...path];
        }
      }
    } else if (current instanceof BsSplitPane) {
      for (const pane of current.panes) {
        const path = this.findContentPanePathRecursive(pane, panel);
        if (path) {
          return [current, ...path];
        }
      }
    } else if (current instanceof BsFloatingPane) {
      const path = this.findContentPanePathRecursive(current.pane, panel);
      if (path) {
        return [current, ...path];
      }
    } else if (current instanceof BsDocumentHost) {
      const path = this.findContentPanePathRecursive(current.rootPane, panel);
      if (path) {
        return [current, ...path];
      }
    }

    return null;
  }
}

interface RegisteredRenderer {
  renderer: BsDockPaneRendererComponent;
  element: HTMLElement;
}

type DockZonePlacement = 'left' | 'right' | 'top' | 'bottom' | 'center';

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface DockDropZone {
  pane: BsTabGroupPane;
  path: BsDockPane[];
  rect: Rect;
  zone: DockZonePlacement;
}

interface DockDropIndicator {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DockDragState {
  panel: BsDockPanelComponent;
  floatingPane: BsFloatingPane;
  draggedPane: BsContentPane;
  offsetX: number;
  offsetY: number;
  dropTargets: DockDropZone[];
  currentTarget?: DockDropZone;
  pointerPosition?: { x: number; y: number; };
}

interface RemovedPanel {
  contentPane: BsContentPane;
  floatingHost?: BsFloatingPane;
}
