import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentRef, ElementRef, EventEmitter, Inject, Injector, Input, OnDestroy, Output, StaticProvider, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, Subject, takeUntil } from 'rxjs';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { OffcanvasPosition } from '../../types/position';
import { BsOffcanvasComponent } from '../offcanvas/offcanvas.component';

@Component({
  selector: 'bs-offcanvas',
  templateUrl: './offcanvas-host.component.html',
  styleUrls: ['./offcanvas-host.component.scss']
})
export class BsOffcanvasHostComponent implements AfterViewInit, OnDestroy {

  constructor(private overlayService: Overlay, private rootInjector: Injector, @Inject(PORTAL_FACTORY) private portalFactory: (injector: Injector) => ComponentPortal<any>) {
    this.show$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((show) => {
        if (this.component) {
          this.showChange.emit(show);
          this.component.instance.show$.next(show);
        }
      });

    combineLatest([this.position$, this.viewInited$])
      .pipe(filter(([position, viewInited]) => viewInited))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([position, viewInited]) => {
        if (this.component) {
          this.component.instance.position$.next(position);
        }
      });

    combineLatest([this.size$, this.viewInited$])
      .pipe(filter(([size, viewInited]) => viewInited))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([size, viewInited]) => {
        if (this.component) {
          this.component.instance.size$.next(size);
        }
      });
      
    combineLatest([this.hasBackdrop$, this.viewInited$])
      .pipe(filter(([hasBackdrop, viewInited]) => viewInited))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([hasBackdrop, viewInited]) => {
        if (this.component) {
          this.component.instance.hasBackdrop$.next(hasBackdrop);
        }
      });
  }

  content!: TemplateRef<any>;
  component!: ComponentRef<BsOffcanvasComponent>;
  viewInited$ = new BehaviorSubject<boolean>(false);
  show$ = new BehaviorSubject<boolean>(false);
  size$ = new BehaviorSubject<number | null>(null);
  position$ = new BehaviorSubject<OffcanvasPosition>('bottom');
  hasBackdrop$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();

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
    const overlayRef = this.overlayService.create({
      scrollStrategy: this.overlayService.scrollStrategies.block(),
      positionStrategy: this.overlayService.position().global()
        .top('0').left('0').bottom('0').right('0'),
      hasBackdrop: false
    });

    this.component = overlayRef.attach<BsOffcanvasComponent>(portal);

    this.component.instance.backdropClick
      .pipe(takeUntil(this.destroyed$))
      .subscribe((ev) => {
        this.backdropClick.emit(ev);
      });

    this.viewInited$.next(true);
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  //#region Show
  @Output() public showChange = new EventEmitter<boolean>();
  @Input() public set show(value: boolean) {
    this.show$.next(value);
  }
  public get show() {
    return this.show$.value;
  }
  //#endregion

  //#region Position
  @Input() public set position(value: OffcanvasPosition) {
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
