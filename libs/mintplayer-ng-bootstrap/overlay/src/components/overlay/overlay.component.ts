import { AfterContentInit, Component, ComponentRef, ContentChild, EventEmitter, InjectionToken, Input, OnDestroy, Output, TemplateRef, Type, inject } from '@angular/core';
import { BsOverlayService } from '../../services/overlay/overlay.service';
import { GlobalPositionConfig, ScrollStrategyType } from '../../interfaces';
import { OverlayHandle } from '../../interfaces/overlay-handle.interface';
import { BsOverlayContentDirective } from '../../directives/overlay-content/overlay-content.directive';

@Component({
  selector: 'bs-overlay',
  standalone: true,
  templateUrl: './overlay.component.html',
  styleUrls: ['./overlay.component.scss'],
})
export class BsOverlayComponent<T = any> implements AfterContentInit, OnDestroy {
  private overlayService = inject(BsOverlayService);

  @ContentChild(BsOverlayContentDirective) contentDirective!: BsOverlayContentDirective;

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
  private handle: OverlayHandle<T> | null = null;

  ngAfterContentInit() {
    // Use setTimeout to ensure the content directive is fully initialized
    setTimeout(() => this.createOverlay(), 0);
  }

  private createOverlay() {
    const template = this.contentDirective?.getTemplate();

    if (!template || !this.contentComponent || !this.contentToken) {
      console.warn('BsOverlayComponent: Missing required configuration (template, contentComponent, or contentToken)');
      return;
    }

    this.handle = this.overlayService.createGlobal<T>({
      contentComponent: this.contentComponent,
      contentToken: this.contentToken,
      template: template,
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
