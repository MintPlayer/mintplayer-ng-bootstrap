import { ApplicationRef, DestroyRef, Directive, DOCUMENT, effect, EmbeddedViewRef, inject, TemplateRef, untracked, ViewContainerRef } from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { createBodyHost } from '@mintplayer/ui-core/overlay';

/**
 * Render an `<ng-template>` into a body host (#458 §4.4): a `div` appended to
 * the end of `<body>`, outside every clipping ancestor. The compiled form of a
 * view's `<teleport to="body">`, and the twin of React's `createPortal`, Vue's
 * `<Teleport to="body">` and Lit's `bodyTeleport()`.
 *
 * The view is created DETACHED (`TemplateRef.createEmbeddedView` +
 * `ApplicationRef.attachView`), never in this anchor's container, so the
 * component's hydration info holds no view whose nodes are elsewhere. The
 * server renders it into its body host; the client removes that copy (same
 * deterministic id) and renders its own, outside hydration. Change detection
 * reaches it through the application; it reads the declaring component's
 * members, because an embedded view keeps its declaration context.
 *
 *     @if (open()) { <ng-template mpBodyTeleport>…</ng-template> }
 */
@Directive({ selector: '[mpBodyTeleport]' })
export class MpBodyTeleportDirective {
  private readonly template = inject(TemplateRef);
  private readonly appRef = inject(ApplicationRef);
  private readonly document = inject(DOCUMENT);
  private readonly anchor = inject(ViewContainerRef).element.nativeElement as Node;
  /** Identical on the server and on hydration: the client replaces the server's host by it. */
  readonly id = inject(BsIdService).next('mp-overlay');
  private view: EmbeddedViewRef<unknown> | null = null;
  private host: HTMLElement | null = null;

  constructor() {
    // An effect runs during change detection on the server too, where afterNextRender never does.
    effect(() =>
      untracked(() => {
        if (this.view) return;
        this.host = createBodyHost(this.document, this.id, this.anchor.parentElement);
        this.view = this.template.createEmbeddedView({});
        this.appRef.attachView(this.view);
        this.view.detectChanges();
        this.view.rootNodes.forEach((node: Node) => this.host!.appendChild(node));
      }),
    );
    inject(DestroyRef).onDestroy(() => {
      if (this.view) {
        this.appRef.detachView(this.view);
        this.view.destroy();
      }
      this.host?.remove();
      this.view = this.host = null;
    });
  }
}
