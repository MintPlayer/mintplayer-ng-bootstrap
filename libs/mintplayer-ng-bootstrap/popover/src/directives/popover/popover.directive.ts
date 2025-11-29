import { ConnectedPosition } from '@angular/cdk/overlay';
import { Position } from '@mintplayer/ng-bootstrap';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, delay, map, Observable, take } from 'rxjs';
import { AfterViewInit, DestroyRef, Directive, ElementRef, inject, Input, OnDestroy, TemplateRef } from '@angular/core';
import { BsOverlayService, getConnectedPositions, OverlayHandle } from '@mintplayer/ng-bootstrap/overlay';
import { BsPopoverComponent } from '../../component/popover.component';
import { POPOVER_CONTENT } from '../../providers/popover-content.provider';

@Directive({
  selector: '*[bsPopover]',
  standalone: false,
})
export class BsPopoverDirective implements AfterViewInit, OnDestroy {
  private overlayService = inject(BsOverlayService);
  private destroy = inject(DestroyRef);
  private templateRef = inject(TemplateRef);
  private parent = inject(ElementRef, { host: true, skipSelf: true });

  @Input() public set bsPopover(value: Position) {
    this.position$.next(value);
  }

  @Input() public updatePosition = false;

  private handle: OverlayHandle<BsPopoverComponent> | null = null;
  position$ = new BehaviorSubject<Position>('bottom');
  connectedPosition$: Observable<ConnectedPosition>;
  isVisible$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.position$.pipe(takeUntilDestroyed()).subscribe((position) => {
      if (this.handle?.componentRef) {
        this.handle.componentRef.instance.position = position;
      }
    });
    this.isVisible$.pipe(takeUntilDestroyed()).subscribe((isVisible) => {
      if (this.handle?.componentRef) {
        this.handle.componentRef.instance.isVisible = isVisible;
      }
    });
    this.connectedPosition$ = this.position$
      .pipe(delay(20), map((position) => {
        return getConnectedPositions(position)[0];
      }));

    this.connectedPosition$
      .pipe(takeUntilDestroyed())
      .subscribe((connectedPosition) => {
        if (this.handle?.overlayRef) {
          this.handle.updatePosition();
        }
      });
  }

  ngAfterViewInit() {
    this.connectedPosition$.pipe(take(1), takeUntilDestroyed(this.destroy)).subscribe((connectedPosition) => {
      this.handle = this.overlayService.createConnected<BsPopoverComponent>({
        connectedTo: this.parent,
        positions: [connectedPosition],
        contentComponent: BsPopoverComponent,
        contentToken: POPOVER_CONTENT,
        template: this.templateRef,
        scrollStrategy: 'reposition',
      });

      if (this.handle.componentRef) {
        this.handle.componentRef.instance.position = this.position$.value;
      }
    });

    this.parent.nativeElement.onclick = () => {
      if (this.updatePosition) {
        this.handle?.updatePosition();
      }
      this.isVisible$.next(!this.isVisible$.value);
    };
  }

  ngOnDestroy() {
    this.handle?.dispose();
    this.handle = null;
  }
}
