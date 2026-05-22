import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Position } from '@mintplayer/ng-bootstrap';
import { AfterViewInit, ComponentRef, Directive, ElementRef, Host, inject, Injector, input, OnDestroy, signal, SkipSelf, TemplateRef, computed, effect } from '@angular/core';
import { BsIdService, BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { BsPopoverComponent } from '../../component/popover.component';
import { POPOVER_CONTENT } from '../../providers/popover-content.provider';
import { POPOVER_ID } from '../../providers/popover-id.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
@Directive({
  selector: '*[bsPopover]',
  providers: [{
    provide: PORTAL_FACTORY,
    useValue: (injector: Injector) => {
      return new ComponentPortal(BsPopoverComponent, null, injector);
    }
  }],
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class BsPopoverDirective implements AfterViewInit, OnDestroy {

  private overlay = inject(Overlay);
  private templateRef = inject(TemplateRef<any>);
  private parentInjector = inject(Injector);
  private portalFactory = inject(PORTAL_FACTORY);
  private parent = inject(ElementRef, { host: true, skipSelf: true });
  private ids = inject(BsIdService);
  private overlayStack = inject(BsOverlayStackService);
  private readonly popoverId = this.ids.next('bs-popover');
  private stackToken: symbol | null = null;

  bsPopover = input<Position>('bottom');
  updatePosition = input(false);

  private localInjector: Injector | null = null;
  private portal: ComponentPortal<any> | null = null;
  private overlayRef: OverlayRef | null = null;
  private component: ComponentRef<BsPopoverComponent> | null = null;
  isVisible = signal<boolean>(false);

  connectedPosition = computed<ConnectedPosition>(() => {
    const position = this.bsPopover();
    switch (position) {
      case 'top':
        return {
          originX: "center",
          originY: "top",
          overlayX: "center",
          overlayY: "bottom"
        };
      case 'start':
        return {
          originX: "start",
          originY: "center",
          overlayX: "end",
          overlayY: "center",
        };
      case 'end':
        return {
          originX: "end",
          originY: "center",
          overlayX: "start",
          overlayY: "center"
        };
      default:
        return {
          originX: "center",
          originY: "bottom",
          overlayX: "center",
          overlayY: "top"
        };
    }
  });

  constructor() {
    effect(() => {
      const position = this.bsPopover();
      if (this.component) {
        this.component.setInput('position', position);
      }
    });

    effect(() => {
      const isVisible = this.isVisible();
      if (this.component) {
        this.component.setInput('isVisible', isVisible);
      }
      this.parent.nativeElement.setAttribute('aria-expanded', isVisible ? 'true' : 'false');

      if (isVisible && this.stackToken === null) {
        this.stackToken = this.overlayStack.push();
      } else if (!isVisible && this.stackToken !== null) {
        this.overlayStack.release(this.stackToken);
        this.stackToken = null;
      }
    });

    effect(() => {
      const connectedPosition = this.connectedPosition();
      if (this.overlayRef) {
        setTimeout(() => {
          this.overlayRef?.updatePositionStrategy(this.overlay.position()
            .flexibleConnectedTo(this.parent)
            .withPositions([connectedPosition]));
        }, 20);
      }
    });
  }

  ngAfterViewInit() {
    const connectedPosition = this.connectedPosition();
    this.localInjector = Injector.create({
      providers: [
        { provide: POPOVER_CONTENT, useValue: this.templateRef },
        { provide: POPOVER_ID, useValue: this.popoverId },
      ],
      parent: this.parentInjector
    });
    this.portal = this.portalFactory(this.localInjector);
    this.overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .flexibleConnectedTo(this.parent)
        .withPositions([connectedPosition]),
    });
    this.component = this.overlayRef.attach<BsPopoverComponent>(this.portal);
    this.component.setInput('position', this.bsPopover());

    // Trigger ARIA: identifies the trigger as a disclosure that opens a dialog.
    this.parent.nativeElement.setAttribute('aria-haspopup', 'dialog');
    this.parent.nativeElement.setAttribute('aria-controls', this.popoverId);
    this.parent.nativeElement.setAttribute('aria-expanded', 'false');

    this.parent.nativeElement.onclick = () => {
      if (this.updatePosition()) {
        this.overlayRef?.updatePosition();
      }
      this.isVisible.set(!this.isVisible());
    };
  }

  onEscape() {
    if (this.isVisible() && this.stackToken !== null && this.overlayStack.isTop(this.stackToken)) {
      this.isVisible.set(false);
    }
  }

  ngOnDestroy() {
    if (this.stackToken !== null) {
      this.overlayStack.release(this.stackToken);
      this.stackToken = null;
    }
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
