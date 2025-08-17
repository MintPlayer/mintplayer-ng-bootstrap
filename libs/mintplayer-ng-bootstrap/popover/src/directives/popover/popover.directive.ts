import { ConnectedPosition, Overlay, OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Position } from '@mintplayer/ng-bootstrap';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, delay, map, Observable, take } from 'rxjs';
import { AfterViewInit, ComponentRef, DestroyRef, Directive, ElementRef, Host, Inject, Injector, Input, OnDestroy, SkipSelf, TemplateRef } from '@angular/core';
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
    private destroy: DestroyRef,
    private templateRef: TemplateRef<any>,
    private parentInjector: Injector,
    private destroy: DestroyRef,
    @Inject(PORTAL_FACTORY) private portalFactory: (injector: Injector) => ComponentPortal<any>,
    @Host() @SkipSelf() private parent: ElementRef
  ) {
    this.position$.pipe(takeUntilDestroyed()).subscribe((position) => {
      if (this.component) {
        this.component.instance.position = position;
      }
    });
    this.isVisible$.pipe(takeUntilDestroyed()).subscribe((isVisible) => {
      if (this.component) {
        this.component.instance.isVisible = isVisible;
      }
    });
    this.connectedPosition$ = this.position$
      .pipe(delay(20), map((position) => {
        switch (position) {
          case 'top':
            return <ConnectedPosition>{
              originX: "center",
              originY: "top", //<--
              overlayX: "center",
              overlayY: "bottom"
            };
          case 'start':
            return <ConnectedPosition>{
              originX: "start", //<--
              originY: "center",
              overlayX: "end",
              overlayY: "center",
            };
          case 'end':
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
      .pipe(takeUntilDestroyed())
      .subscribe((connectedPosition) => {
        if (this.overlayRef) {
          this.overlayRef.updatePositionStrategy(this.overlay.position()
            .flexibleConnectedTo(this.parent)
            .withPositions([connectedPosition]));
        }
      });
  }

  @Input() public set bsPopover(value: Position) {
    this.position$.next(value);
  }

  @Input() public updatePosition = false;

  private injector: Injector | null = null;
  private portal: ComponentPortal<any> | null = null;
  private overlayRef: OverlayRef | null = null;
  private component: ComponentRef<BsPopoverComponent> | null = null;
  position$ = new BehaviorSubject<Position>('bottom');
  connectedPosition$: Observable<ConnectedPosition>;
  isVisible$ = new BehaviorSubject<boolean>(false);

  ngAfterViewInit() {
    this.connectedPosition$.pipe(take(1), takeUntilDestroyed(this.destroy)).subscribe((connectedPosition) => {
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
      if (this.updatePosition) {
        this.overlayRef?.updatePosition();
      }
      this.isVisible$.next(!this.isVisible$.value);
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
