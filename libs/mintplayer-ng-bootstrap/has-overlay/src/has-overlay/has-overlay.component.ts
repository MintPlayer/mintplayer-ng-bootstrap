import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Marker component whose only job is to pull in @angular/cdk/overlay-prebuilt
 * CSS via its SCSS (::ng-deep import). The template is intentionally empty;
 * placing <bs-has-overlay></bs-has-overlay> inside any component that opens a
 * CDK overlay (modal, offcanvas, popover, dropdown-based pickers, etc.)
 * guarantees the overlay container's positioning styles ship with the component
 * bundle, regardless of whether the host app pulled them in globally.
 *
 * The audit (docs/prd/aria-accessibility-audit.md §5.1) flagged this as
 * "empty, purpose unclear" and suggested it should hide background content
 * via aria-hidden/inert when an overlay is open. That responsibility lives in
 * BsOverlayFocus + each per-component overlay logic (modal hides app-root,
 * popover doesn't), not here. has-overlay is and remains a CSS-injection marker.
 */
@Component({
  selector: 'bs-has-overlay',
  templateUrl: './has-overlay.component.html',
  styleUrls: ['./has-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsHasOverlayComponent {}
