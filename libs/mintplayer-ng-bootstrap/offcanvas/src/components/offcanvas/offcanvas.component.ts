import { isPlatformServer, NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, output, PLATFORM_ID, signal, TemplateRef, untracked, ChangeDetectionStrategy} from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';

@Component({
  selector: 'bs-offcanvas-holder',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  imports: [NgTemplateOutlet],
  animations: [FadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsOffcanvasComponent {

  contentTemplate = inject<TemplateRef<any>>(OFFCANVAS_CONTENT);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    // Effect to handle position changes - disable transition temporarily
    effect(() => {
      const position = this.position();
      // Use untracked to avoid creating dependency on disableTransition
      untracked(() => {
        this.disableTransition.set(true);
        this.offcanvasClass.set(`offcanvas-${position}`);
        // Re-enable transitions after browser has processed position change
        if (!isPlatformServer(this.platformId)) {
          requestAnimationFrame(() => {
            this.disableTransition.set(false);
          });
        }
      });
    });

    // Effect to handle visibility changes
    effect(() => {
      const isVisible = this.isVisible();
      untracked(() => {
        if (isVisible) {
          // When showing: set visibility immediately, then add .show class after position is applied
          this.visibility.set('visible');
          // Delay adding .show class to allow position to be applied first
          if (!isPlatformServer(this.platformId)) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                this.show.set(true);
              });
            });
          }
        } else {
          // When hiding: remove .show class immediately, delay visibility for animation
          this.show.set(false);
          setTimeout(() => {
            if (!this.isVisible()) {
              this.visibility.set('hidden');
            }
          }, 300);
        }
      });
    });
  }

  // Core state signals
  position = signal<Position>('bottom');
  size = signal<number | null>(null);
  isVisible = signal<boolean>(false);
  hasBackdrop = signal<boolean>(false);

  // Internal state signals
  disableTransition = signal<boolean>(false);
  offcanvasClass = signal<string | null>(null);
  visibility = signal<string>('hidden');
  show = signal<boolean>(false);

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

  // Outputs
  isVisibleChange = output<boolean>();
  backdropClick = output<MouseEvent>();

  onBackdropClick(ev: MouseEvent) {
    this.backdropClick.emit(ev);
  }

}
