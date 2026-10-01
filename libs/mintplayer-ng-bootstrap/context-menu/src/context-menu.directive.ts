import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, inject, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[bsContextMenu]',
  host: {
    '(document:click)': 'clickAnywhere($event)',
    '(window:blur)': 'onBlur()',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class BsContextMenuDirective {
  private readonly overlay = inject(Overlay);
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly viewContainerRef = inject(ViewContainerRef);
  /** The element the structural directive sits on: the menu's trigger. */
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef, { host: true, skipSelf: true });

  private overlayRef: OverlayRef | null = null;
  private returnTarget: HTMLElement | null = null;

  constructor() {
    const host = this.element.nativeElement;
    /* addEventListener rather than the .oncontextmenu property — the property
       write silently clobbered any consumer handler on the same element. */
    const onContextMenu = (ev: MouseEvent) => this.openAt(ev.clientX, ev.clientY, ev);

    // The keyboard's context-menu keys: Shift+F10 and the dedicated key. The
    // menu opens at the element the user is on, so it needs to be reachable —
    // consumers put [bsContextMenu] on focusable rows/cards; a non-focusable
    // host simply never receives the keydown, same as today's right-click on a
    // hidden node.
    const onKeydown = (ev: KeyboardEvent) => {
      const isMenuKey = ev.key === 'ContextMenu' || (ev.key === 'F10' && ev.shiftKey);
      if (!isMenuKey) return;
      const rect = (ev.target as HTMLElement).getBoundingClientRect();
      this.openAt(rect.left + rect.width / 2, rect.bottom, ev);
    };

    host.addEventListener('contextmenu', onContextMenu);
    host.addEventListener('keydown', onKeydown);

    // The trigger can outlive this directive (an @if around the template), so
    // the listeners and an open menu must not.
    inject(DestroyRef).onDestroy(() => {
      host.removeEventListener('contextmenu', onContextMenu);
      host.removeEventListener('keydown', onKeydown);
      this.close();
    });
  }

  private openAt(x: number, y: number, ev: Event): void {
    ev.preventDefault();
    this.checkAndCloseExisting(ev);

    // With `scroll-behavior: smooth`, the scroll that brought the trigger
    // into view (e.g. keyboard focus moments before Shift+F10) can still be
    // animating; its next frame would hit the close-on-scroll strategy and
    // dismiss the menu in the same breath it opened. An instant scroll to
    // the current position cancels any in-flight animation.
    window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' });

    const origin = new ElementRef({
      getBoundingClientRect: () => ({ width: 0, height: 0, top: y, left: x, bottom: y, right: x }),
    });

    this.overlayRef = this.overlay.create({
      hasBackdrop: false,
      // The threshold keeps the sub-pixel scroll event from the animation
      // cancel above (scroll events fire a frame later, after this overlay
      // attaches) from dismissing the menu in the tick it opened, while a
      // real user scroll still closes it like a native context menu.
      scrollStrategy: this.overlay.scrollStrategies.close({ threshold: 24 }),
      positionStrategy: this.overlay.position()
        .flexibleConnectedTo(origin)
        .withPositions([
          { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top' },
          { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
          { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
          { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom' },
        ]),
    });
    const view = this.overlayRef.attach(new TemplatePortal(this.templateRef, this.viewContainerRef));
    // Only elements take the class: a template rooted in @if or ng-container also
    // yields comment nodes, which have no classList.
    const roots = (view.rootNodes as Node[]).filter((node): node is HTMLElement => node instanceof HTMLElement);
    roots.map((node) => node.classList.add('position-static'));

    // Focus moves into the menu so arrows/Enter operate it; captured target
    // gets focus back on close (Escape must not strand focus on <body>).
    this.returnTarget = document.activeElement instanceof HTMLElement
      && document.activeElement !== document.body ? document.activeElement : null;
    // Entry is deferred a tick: the menu's roving focus assigns the items'
    // tabindex after attach, so a synchronous query races it — the same
    // treatment as BsDropdownToggleDirective.onArrowDown. preventScroll is
    // load-bearing: the overlay closes on scroll, and a scroll-into-view
    // from this focus would dismiss the menu in the tick it opened.
    setTimeout(() => {
      const first = roots
        .map((node) => node.querySelector<HTMLElement>(MENU_ITEM))
        .find((el): el is HTMLElement => !!el);
      first?.focus({ preventScroll: true });
    });
  }

  onEscape() {
    this.close();
  }

  clickAnywhere(ev: MouseEvent) {
    this.checkAndCloseExisting(ev);
  }

  onBlur() {
    this.close();
  }

  private close() {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.returnTarget?.focus({ preventScroll: true });
    this.returnTarget = null;
  }

  private checkAndCloseExisting(ev: Event) {
    if (this.overlayRef && !this.overlayRef.overlayElement.contains(ev.target as Node)) {
      this.close();
    }
  }
}

/** What receives focus when the menu opens: its first item. */
const MENU_ITEM = '[role="menuitem"], .dropdown-item, button, a[href], [tabindex]';
