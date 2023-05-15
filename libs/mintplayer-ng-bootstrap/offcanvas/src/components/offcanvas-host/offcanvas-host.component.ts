import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentRef, EventEmitter, Inject, Injector, Input, OnDestroy, Output, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BsViewState, Position } from '@mintplayer/ng-bootstrap';
import { BehaviorSubject, combineLatest, filter } from 'rxjs';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsOffcanvasComponent } from '../offcanvas/offcanvas.component';

@Component({
  selector: 'bs-offcanvas',
  templateUrl: './offcanvas-host.component.html',
  styleUrls: ['./offcanvas-host.component.scss']
})
export class BsOffcanvasHostComponent implements AfterViewInit, OnDestroy {

  constructor(private overlayService: Overlay, private rootInjector: Injector, @Inject(PORTAL_FACTORY) private portalFactory: (injector: Injector) => ComponentPortal<any>) {
    this.state$
      .pipe(takeUntilDestroyed())
      .subscribe((state) => {
        if (this.component) {
          this.stateChange.emit(state);
          this.component.instance.state$.next(state);
        }
      });

    combineLatest([this.position$, this.viewInited$])
      .pipe(filter(([position, viewInited]) => viewInited))
      .pipe(takeUntilDestroyed())
      .subscribe(([position, viewInited]) => this.component && this.component.instance.position$.next(position));

    combineLatest([this.size$, this.viewInited$])
      .pipe(filter(([size, viewInited]) => viewInited))
      .pipe(takeUntilDestroyed())
      .subscribe(([size, viewInited]) => this.component && this.component.instance.size$.next(size));
      
    combineLatest([this.hasBackdrop$, this.viewInited$])
      .pipe(filter(([hasBackdrop, viewInited]) => viewInited))
      .pipe(takeUntilDestroyed())
      .subscribe(([hasBackdrop, viewInited]) => this.component && this.component.instance.hasBackdrop$.next(hasBackdrop));
  }

  content!: TemplateRef<any>;
  overlayRef!: OverlayRef;
  component!: ComponentRef<BsOffcanvasComponent>;
  viewInited$ = new BehaviorSubject<boolean>(false);
  state$ = new BehaviorSubject<BsViewState>('closed');
  size$ = new BehaviorSubject<number | null>(null);
  position$ = new BehaviorSubject<Position>('bottom');
  hasBackdrop$ = new BehaviorSubject<boolean>(false);

  @Output() backdropClick = new EventEmitter<MouseEvent>();

  ngAfterViewInit() {
    const injector = Injector.create({
      providers: [
        { provide: OFFCANVAS_CONTENT, useValue: this.content },
      ],
      parent: this.rootInjector,
    });
    // const portal = new ComponentPortal(BsOffcanvasComponent, null, injector);
    const portal = this.portalFactory(injector);
    this.overlayRef = this.overlayService.create({
      scrollStrategy: this.overlayService.scrollStrategies.block(),
      positionStrategy: this.overlayService.position().global()
        .top('0').left('0').bottom('0').right('0'),
      hasBackdrop: false
    });

    this.component = this.overlayRef.attach<BsOffcanvasComponent>(portal);

    this.component.instance.backdropClick
      .pipe(takeUntilDestroyed())
      .subscribe((ev) => this.backdropClick.emit(ev));

    this.viewInited$.next(true);
  }

  ngOnDestroy() {
    this.state = 'closed';
    setTimeout(() => this.overlayRef && this.overlayRef.dispose(), 3000);
  }

  //#region State
  @Output() public stateChange = new EventEmitter<BsViewState>();
  @Input() public set state(value: BsViewState) {
    this.state$.next(value);
    if (this.component) {
      this.component.instance.state = value;
    }
    this.stateChange.emit(value);
  }
  public get state() {
    return this.state$.value;
  }
  //#endregion

  //#region Position
  @Input() public set position(value: Position) {
    this.position$.next(value);
  }
  public get position() {
    return this.position$.value;
  }
  //#endregion

  //#region Size
  @Input() public set size(value: number | null) {
    this.size$.next(value);
  }
  public get size() {
    return this.size$.value;
  }
  //#endregion

  //#region HasBackdrop
  @Input() public set hasBackdrop(value: boolean) {
    this.hasBackdrop$.next(value);
  }
  public get hasBackdrop() {
    return this.hasBackdrop$.value;
  }
  //#endregion

}
