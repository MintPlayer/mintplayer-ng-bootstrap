import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Directive, ElementRef, Host, SkipSelf, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[bsContextMenu]',
  host: {
    '(document:click)': 'clickAnywhere($event)',
    '(window:blur)': 'onBlur()',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class BsContextMenuDirective {

  constructor(
    private overlay: Overlay,
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef,
    @Host() @SkipSelf() private element: ElementRef
  ) {
    /* addEventListener rather than the .oncontextmenu property — the property
       write silently clobbered any consumer handler on the same element. */
    this.element.nativeElement.addEventListener('contextmenu', (ev: MouseEvent) => this.openAt(ev.clientX, ev.clientY, ev));

    // The keyboard's context-menu keys: Shift+F10 and the dedicated key. The
    // menu opens at the element the user is on, so it needs to be reachable —
    // consumers put [bsContextMenu] on focusable rows/cards; a non-focusable
    // host simply never receives the keydown, same as today's right-click on a
    // hidden node.
    this.element.nativeElement.addEventListener('keydown', (ev: KeyboardEvent) => {
      const isMenuKey = ev.key === 'ContextMenu' || (ev.key === 'F10' && ev.shiftKey);
      if (!isMenuKey) return;
      ev.preventDefault();
      const rect = (ev.target as HTMLElement).getBoundingClientRect();
      this.openAt(rect.left + rect.width / 2, rect.bottom, ev);
    });
  }

  private openAt(x: number, y: number, ev: Event): void {
      ev.preventDefault();
      this.checkAndCloseExisting(ev);

      const target = {
        getBoundingClientRect: () => {
          return  ({
            width: 0,
            height: 0,
            top: y,
            left: x,
            bottom: y,
            right: x,
          });
        },
      };
      const element = new ElementRef(target);

      this.overlayRef = this.overlay.create({
        hasBackdrop: false,
        scrollStrategy: this.overlay.scrollStrategies.close(),
        positionStrategy: this.overlay.position()
        .flexibleConnectedTo(element)
        .withPositions([
          { originX: "end", originY: "top", overlayX: "start", overlayY: "top" },
          { originX: "end", originY: "bottom", overlayX: "start", overlayY: "bottom" },
          { originX: "start", originY: "top", overlayX: "end", overlayY: "top" },
          { originX: "start", originY: "bottom", overlayX: "end", overlayY: "bottom" },
        ])
      });
      this.templatePortal = new TemplatePortal(this.templateRef, this.viewContainerRef);
      const view = this.overlayRef.attach(this.templatePortal);
      view.rootNodes.forEach(node => node.classList.add('position-static'));

      // Focus moves into the menu so arrows/Enter operate it; captured target
      // gets focus back on close (Escape must not strand focus on <body>).
      this.returnTarget = document.activeElement instanceof HTMLElement
        && document.activeElement !== document.body ? document.activeElement : null;
      const first = view.rootNodes
        .map((node: HTMLElement) => node.querySelector?.<HTMLElement>('button, a[href], [tabindex]'))
        .find((el: HTMLElement | null | undefined) => !!el);
      first?.focus();
  }

  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;
  private returnTarget: HTMLElement | null = null;

  onEscape() {
    if (this.overlayRef) this.close();
  }

  clickAnywhere(ev: MouseEvent) {
    this.checkAndCloseExisting(ev);
  }

  onBlur() {
    this.close();
  }

  private close() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.returnTarget?.focus();
      this.returnTarget = null;
    }
  }

  private checkAndCloseExisting(ev: Event) {
    if (this.overlayRef && !this.overlayRef.overlayElement.contains(<any>ev.target)) {
      this.close();
    }
  }

}
