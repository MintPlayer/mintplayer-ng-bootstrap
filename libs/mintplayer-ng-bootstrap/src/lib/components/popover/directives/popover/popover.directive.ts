import { ConnectedPosition, Overlay, OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { BehaviorSubject, delay, map, Observable, Subject, take, takeUntil } from 'rxjs';
import { AfterViewInit, ComponentFactoryResolver, ComponentRef, Directive, ElementRef, Host, HostListener, Inject, Injector, Input, OnDestroy, SkipSelf, TemplateRef } from '@angular/core';
import { Position } from '../../../../enums/position.enum';
import { BsPopoverComponent } from '../../component/popover.component';
import { POPOVER_CONTENT } from '../../providers/popover-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';

@Directive({
  selector: '*[bsPopover]'
})
export class BsPopoverDirective implements AfterViewInit, OnDestroy {

  constructor(
    private overlay: Overlay,
    private templateRef: TemplateRef<any>,
    private parentInjector: Injector,
    @Inject(PORTAL_FACTORY) private portalFactory: (injector: Injector) => ComponentPortal<any>,
    @Host() @SkipSelf() private parent: ElementRef
  ) {
    this.position$.pipe(takeUntil(this.destroyed$)).subscribe((position) => {
      if (this.component) {
        this.component.instance.position = position;
      }
    });
    this.isVisible$.pipe(takeUntil(this.destroyed$)).subscribe((isVisible) => {
      if (this.component) {
        this.component.instance.isVisible = isVisible;
      }
    });
    this.connectedPosition$ = this.position$
      .pipe(delay(20), map((position) => {
        switch (position) {
          case Position.top:
            return <ConnectedPosition>{
              originX: "center",
              originY: "top", //<--
              overlayX: "center",
              overlayY: "bottom"
            };
          case Position.left:
            return <ConnectedPosition>{
              originX: "start", //<--
              originY: "center",
              overlayX: "end",
              overlayY: "center",
            };
          case Position.right:
            return <ConnectedPosition>{
              originX: "end", //<--
              originY: "center",
              overlayX: "start",
              overlayY: "center"
            };
          default:
            return <ConnectedPosition>{
              originX: "center",
              originY: "bottom", //<--
              overlayX: "center",
              overlayY: "top"
            };
        }
      }));

    this.connectedPosition$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((connectedPosition) => {
        if (this.overlayRef) {
          this.overlayRef.updatePositionStrategy(this.overlay.position()
            .flexibleConnectedTo(this.parent)
            .withPositions([connectedPosition]));
        }
      });

    this.destroyed$.pipe(take(1)).subscribe(() => {
      if (this.overlayRef) {
        this.overlayRef.detach();
        this.overlayRef.dispose();
        this.overlayRef = null;
      }
    });
  }

  @Input() public set bsPopover(value: Position) {
    this.position$.next(value);
  }

  private injector: Injector | null = null;
  private portal: ComponentPortal<any> | null = null;
  private overlayRef: OverlayRef | null = null;
  private component: ComponentRef<BsPopoverComponent> | null = null;
  position$ = new BehaviorSubject<Position>(Position.bottom);
  connectedPosition$: Observable<ConnectedPosition>;
  isVisible$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();

  ngAfterViewInit() {
    this.connectedPosition$.pipe(take(1)).subscribe((connectedPosition) => {
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
      this.component.instance.position = this.position$.value;
    });
    
    this.parent.nativeElement.onclick = () => {
      this.isVisible$.pipe(take(1)).subscribe((isVisible) => {
        this.isVisible$.next(!isVisible);
      });
    };
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

}
