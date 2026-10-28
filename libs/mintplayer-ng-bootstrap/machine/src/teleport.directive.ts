import { DestroyRef, Directive, effect, EmbeddedViewRef, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';

/**
 * Render an `<ng-template>` into another element, the compiled form of a view's
 * `<teleport :to>`. The twin of React's `createPortal`, Vue's `<Teleport>` and
 * Lit's `teleport()`. The view lives in this container, so change detection and
 * destruction follow the component, but its root nodes are moved into `to`, as
 * CDK's DomPortalOutlet does. Nothing renders while `to` is null, which is the
 * server's case. A core hands a target whose identity never changes (the
 * dock's per-pane hosts), so the content's state survives wherever the core
 * moves that target.
 *
 *     <ng-template [mpTeleport]="view.paneHosts[pane]">...</ng-template>
 */
@Directive({ selector: '[mpTeleport]' })
export class MpTeleportDirective {
  readonly mpTeleport = input<Element | null | undefined>(null);

  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private view: EmbeddedViewRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const to = this.mpTeleport() ?? null;
      if (!to) {
        this.container.clear();
        this.view = null;
        return;
      }
      this.view ??= this.container.createEmbeddedView(this.template);
      // The view's nodes render in place first; detectChanges fills them before they move.
      this.view.detectChanges();
      this.view.rootNodes.filter((node: Node) => node.parentNode !== to).forEach((node: Node) => to.appendChild(node));
    });
    inject(DestroyRef).onDestroy(() => this.container.clear());
  }
}
