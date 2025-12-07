import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Position } from '@mintplayer/ng-bootstrap';
import { AfterViewInit, ComponentRef, Directive, ElementRef, Host, Inject, Injector, Input, OnDestroy, SkipSelf, TemplateRef, signal, computed, effect, untracked } from '@angular/core';
import { BsPopoverComponent } from '../../component/popover.component';
import { POPOVER_CONTENT } from '../../providers/popover-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';

@Directive({
  selector: '*[bsPopover]',
  standalone: false,
})
export class BsPopoverDirective implements AfterViewInit, OnDestroy {

  constructor(
    private overlay: Overlay,
    private templateRef: TemplateRef<any>,
    private parentInjector: Injector,
    @Inject(PORTAL_FACTORY) private portalFactory: (injector: Injector) => ComponentPortal<any>,
    @Host() @SkipSelf() private parent: ElementRef
  ) {
    this.connectedPosition = computed(() => {
      const position = this.position();
      switch (position) {
        case 'top':
          return <ConnectedPosition>{
            originX: "center",
            originY: "top",
            overlayX: "center",
            overlayY: "bottom"
          };
        case 'start':
          return <ConnectedPosition>{
            originX: "start",
            originY: "center",
            overlayX: "end",
            overlayY: "center",
          };
        case 'end':
          return <ConnectedPosition>{
            originX: "end",
            originY: "center",
            overlayX: "start",
            overlayY: "center"
          };
        default:
          return <ConnectedPosition>{
            originX: "center",
            originY: "bottom",
            overlayX: "center",
            overlayY: "top"
          };
      }
    });

    effect(() => {
      const position = this.position();
      untracked(() => {
        if (this.component) {
          this.component.instance.position = position;
        }
      });
    });

    effect(() => {
      const isVisible = this.isVisible();
      untracked(() => {
        if (this.component) {
          this.component.instance.isVisible = isVisible;
        }
      });
    });

    // Update overlay position when connected position changes
    let initialized = false;
    effect(() => {
      const connectedPosition = this.connectedPosition();
      if (initialized) {
        // Add delay for position update
        setTimeout(() => {
          untracked(() => {
            if (this.overlayRef) {
              this.overlayRef.updatePositionStrategy(this.overlay.position()
                .flexibleConnectedTo(this.parent)
                .withPositions([connectedPosition]));
            }
          });
        }, 20);
      }
      initialized = true;
    });
  }

  @Input() public set bsPopover(value: Position) {
    this.position.set(value);
  }

  @Input() public updatePosition = false;

  private injector: Injector | null = null;
  private portal: ComponentPortal<any> | null = null;
  private overlayRef: OverlayRef | null = null;
  private component: ComponentRef<BsPopoverComponent> | null = null;
  position = signal<Position>('bottom');
  connectedPosition;
  isVisible = signal<boolean>(false);

  ngAfterViewInit() {
    const connectedPosition = this.connectedPosition();
    this.injector = Injector.create({
      providers: [{ provide: POPOVER_CONTENT, useValue: this.templateRef }],
      parent: this.parentInjector
    });
    this.portal = this.portalFactory(this.injector);
    this.overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .flexibleConnectedTo(this.parent)
        .withPositions([connectedPosition]),
    });
    this.component = this.overlayRef.attach<BsPopoverComponent>(this.portal);
    this.component.instance.position = this.position();

    this.parent.nativeElement.onclick = () => {
      if (this.updatePosition) {
        this.overlayRef?.updatePosition();
      }
      this.isVisible.set(!this.isVisible());
    };
  }

  ngOnDestroy() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
