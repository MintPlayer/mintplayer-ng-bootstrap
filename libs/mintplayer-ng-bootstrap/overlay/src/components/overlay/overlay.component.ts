import { AfterViewInit, Component, ComponentRef, EventEmitter, InjectionToken, Input, OnDestroy, Output, TemplateRef, Type, inject } from '@angular/core';
import { BsOverlayService } from '../../services/overlay/overlay.service';
import { GlobalPositionConfig, ScrollStrategyType } from '../../interfaces';
import { OverlayHandle } from '../../interfaces/overlay-handle.interface';

@Component({
  selector: 'bs-overlay',
  standalone: true,
  templateUrl: './overlay.component.html',
  styleUrls: ['./overlay.component.scss'],
})
export class BsOverlayComponent<T = any> implements AfterViewInit, OnDestroy {
  private overlayService = inject(BsOverlayService);

  // Configuration inputs
  @Input() contentComponent!: Type<T>;
  @Input() contentToken!: InjectionToken<TemplateRef<any>>;
  @Input() globalPosition: GlobalPositionConfig = { top: '0', left: '0', bottom: '0', right: '0' };
  @Input() scrollStrategy: ScrollStrategyType = 'reposition';
  @Input() hasBackdrop: boolean = false;
  @Input() width?: string;
  @Input() cleanupDelay: number = 0;

  // Outputs
  @Output() attached = new EventEmitter<ComponentRef<T>>();
  @Output() backdropClick = new EventEmitter<MouseEvent>();

  // Internal state
  private contentTemplate: TemplateRef<any> | null = null;
  private handle: OverlayHandle<T> | null = null;

  registerContent(template: TemplateRef<any>) {
    this.contentTemplate = template;
  }

  ngAfterViewInit() {
    // Delay to ensure content is registered
    setTimeout(() => this.createOverlay(), 0);
  }

  private createOverlay() {
    if (!this.contentTemplate || !this.contentComponent || !this.contentToken) {
      console.warn('BsOverlayComponent: Missing required configuration');
      return;
    }

    this.handle = this.overlayService.createGlobal<T>({
      contentComponent: this.contentComponent,
      contentToken: this.contentToken,
      template: this.contentTemplate,
      globalPosition: this.globalPosition,
      scrollStrategy: this.scrollStrategy,
      hasBackdrop: this.hasBackdrop,
      width: this.width,
      cleanupDelay: this.cleanupDelay,
    });

    if (this.handle.componentRef) {
      this.attached.emit(this.handle.componentRef);
    }

    // Handle backdrop clicks
    if (this.hasBackdrop) {
      this.handle.overlayRef.backdropClick().subscribe((ev) => {
        this.backdropClick.emit(ev);
      });
    }
  }

  getComponentRef(): ComponentRef<T> | undefined {
    return this.handle?.componentRef;
  }

  ngOnDestroy() {
    this.handle?.dispose();
    this.handle = null;
  }
}
