import { Component, computed, effect, Inject, output, signal, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';

@Component({
  selector: 'bs-offcanvas-holder',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation],
})
export class BsOffcanvasComponent {

  constructor(@Inject(OFFCANVAS_CONTENT) contentTemplate: TemplateRef<any>) {
    this.contentTemplate = contentTemplate;

    // Effect to handle position changes - disable transition temporarily
    effect(() => {
      const position = this.position();
      this.disableTransition.set(true);
      this.offcanvasClass.set(`offcanvas-${position}`);
      setTimeout(() => this.disableTransition.set(false));
    });

    // Effect to handle visibility changes with delayed hiding
    effect(() => {
      const isVisible = this.isVisible();
      if (isVisible) {
        this.visibility.set('visible');
      } else {
        // Delay hiding by 300ms for animation
        setTimeout(() => {
          if (!this.isVisible()) {
            this.visibility.set('hidden');
          }
        }, 300);
      }
    });
  }

  contentTemplate: TemplateRef<any>;

  // Core state signals
  position = signal<Position>('bottom');
  size = signal<number | null>(null);
  isVisible = signal<boolean>(false);
  hasBackdrop = signal<boolean>(false);

  // Internal state signals
  disableTransition = signal<boolean>(false);
  offcanvasClass = signal<string | null>(null);
  visibility = signal<string>('hidden');

  // Computed signals
  width = computed(() => {
    const position = this.position();
    const size = this.size();
    return ['start', 'end'].includes(position) ? size : null;
  });

  height = computed(() => {
    const position = this.position();
    const size = this.size();
    return ['top', 'bottom'].includes(position) ? size : null;
  });

  overflowClass = computed(() => {
    const position = this.position();
    return ['top', 'bottom'].includes(position) ? 'overflow-y-hidden' : 'overflow-x-hidden';
  });

  showBackdrop = computed(() => {
    return this.hasBackdrop() && this.isVisible();
  });

  show = computed(() => this.isVisible());

  // Outputs
  isVisibleChange = output<boolean>();
  backdropClick = output<MouseEvent>();

  onBackdropClick(ev: MouseEvent) {
    this.backdropClick.emit(ev);
  }

}
