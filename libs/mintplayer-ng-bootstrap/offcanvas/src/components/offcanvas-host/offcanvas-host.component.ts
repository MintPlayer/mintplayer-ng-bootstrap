import { Component, ComponentRef, effect, model, OnDestroy, output, signal, TemplateRef } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { GlobalPositionConfig } from '@mintplayer/ng-bootstrap/overlay';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';
import { BsOffcanvasComponent } from '../offcanvas/offcanvas.component';

@Component({
  selector: 'bs-offcanvas',
  templateUrl: './offcanvas-host.component.html',
  styleUrls: ['./offcanvas-host.component.scss'],
  standalone: false,
})
export class BsOffcanvasHostComponent implements OnDestroy {
  content!: TemplateRef<any>;
  private componentRef: ComponentRef<BsOffcanvasComponent> | null = null;

  // Expose for template binding
  readonly contentComponent = BsOffcanvasComponent;
  readonly contentToken = OFFCANVAS_CONTENT;
  readonly globalPosition: GlobalPositionConfig = {
    top: '0',
    left: '0',
    bottom: '0',
    right: '0'
  };

  // Signals
  viewInited = signal<boolean>(false);
  isVisible = model<boolean>(false);
  size = model<number | null>(null);
  position = model<Position>('bottom');
  hasBackdrop = model<boolean>(false);

  backdropClick = output<MouseEvent>();

  constructor() {
    // Effect to sync isVisible with the inner component
    effect(() => {
      const isVisible = this.isVisible();
      if (this.componentRef) {
        this.componentRef.instance.isVisible.set(isVisible);
      }
    });

    // Effect to sync position with the inner component
    effect(() => {
      const position = this.position();
      if (this.componentRef && this.viewInited()) {
        this.componentRef.instance.position.set(position);
      }
    });

    // Effect to sync size with the inner component
    effect(() => {
      const size = this.size();
      if (this.componentRef && this.viewInited()) {
        this.componentRef.instance.size.set(size);
      }
    });

    // Effect to sync hasBackdrop with the inner component
    effect(() => {
      const hasBackdrop = this.hasBackdrop();
      if (this.componentRef && this.viewInited()) {
        this.componentRef.instance.hasBackdrop.set(hasBackdrop);
      }
    });
  }

  onAttached(ref: ComponentRef<BsOffcanvasComponent>) {
    this.componentRef = ref;
    this.componentRef.instance.backdropClick.subscribe((ev) => this.backdropClick.emit(ev));

    // Initialize the inner component with current values
    this.componentRef.instance.isVisible.set(this.isVisible());
    this.componentRef.instance.position.set(this.position());
    this.componentRef.instance.size.set(this.size());
    this.componentRef.instance.hasBackdrop.set(this.hasBackdrop());

    this.viewInited.set(true);
  }

  ngOnDestroy() {
    this.isVisible.set(false);
  }
}
