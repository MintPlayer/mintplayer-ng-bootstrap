import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentRef, effect, inject, Injector, model, OnDestroy, output, OutputRefSubscription, signal, TemplateRef, ChangeDetectionStrategy} from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsOffcanvasComponent } from '../offcanvas/offcanvas.component';

@Component({
  selector: 'bs-offcanvas',
  templateUrl: './offcanvas-host.component.html',
  styleUrls: ['./offcanvas-host.component.scss'],
  standalone: true,
  imports: [BsHasOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: PORTAL_FACTORY,
    useValue: (injector: Injector) => {
      return new ComponentPortal(BsOffcanvasComponent, null, injector);
    }
  }],
})
export class BsOffcanvasHostComponent implements AfterViewInit, OnDestroy {
  private overlayService = inject(Overlay);
  private rootInjector = inject(Injector);
  private portalFactory = inject<(injector: Injector) => ComponentPortal<any>>(PORTAL_FACTORY);

  constructor() {
    // Effect to sync isVisible with the inner component
    effect(() => {
      const isVisible = this.isVisible();
      if (this.component) {
        this.component.instance.isVisible.set(isVisible);
      }
    });

    // Effect to sync position with the inner component
    effect(() => {
      const position = this.position();
      if (this.component && this.viewInited()) {
        this.component.instance.position.set(position);
      }
    });

    // Effect to sync size with the inner component
    effect(() => {
      const size = this.size();
      if (this.component && this.viewInited()) {
        this.component.instance.size.set(size);
      }
    });

    // Effect to sync hasBackdrop with the inner component
    effect(() => {
      const hasBackdrop = this.hasBackdrop();
      if (this.component && this.viewInited()) {
        this.component.instance.hasBackdrop.set(hasBackdrop);
      }
    });
  }

  content!: TemplateRef<any>;
  overlayRef!: OverlayRef;
  component!: ComponentRef<BsOffcanvasComponent>;
  private backdropClickSubscription?: OutputRefSubscription;

  // Signals
  viewInited = signal<boolean>(false);
  isVisible = model<boolean>(false);
  size = model<number | null>(null);
  position = model<Position>('bottom');
  hasBackdrop = model<boolean>(false);

  backdropClick = output<MouseEvent>();

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
      scrollStrategy: this.overlayService.scrollStrategies.reposition(),
      positionStrategy: this.overlayService.position().global()
        .top('0').left('0').bottom('0').right('0'),
      hasBackdrop: false
    });

    this.component = this.overlayRef.attach<BsOffcanvasComponent>(portal);

    this.backdropClickSubscription = this.component.instance.backdropClick.subscribe((ev) => this.backdropClick.emit(ev));

    // Initialize the inner component with current values
    this.component.instance.isVisible.set(this.isVisible());
    this.component.instance.position.set(this.position());
    this.component.instance.size.set(this.size());
    this.component.instance.hasBackdrop.set(this.hasBackdrop());

    this.viewInited.set(true);
  }

  ngOnDestroy() {
    this.backdropClickSubscription?.unsubscribe();
    this.isVisible.set(false);
    setTimeout(() => this.overlayRef && this.overlayRef.dispose(), 3000);
  }

}
