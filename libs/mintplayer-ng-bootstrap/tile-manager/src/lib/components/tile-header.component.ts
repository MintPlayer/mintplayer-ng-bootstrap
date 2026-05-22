import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'bs-tile-header',
  templateUrl: './tile-header.component.html',
  styles: [
    `:host {
       display: flex;
       align-items: center;
       gap: 0.5rem;
       padding: 0.5rem 0.75rem;
       font-size: 0.875rem;
       font-weight: 500;
       color: var(--bs-body-color, inherit);
       background: linear-gradient(to bottom, rgba(var(--bs-primary-rgb, 13, 110, 253), 0.10), rgba(var(--bs-primary-rgb, 13, 110, 253), 0.04));
       border-bottom: 1px solid var(--bs-border-color, #dee2e6);
       overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;
       touch-action: none;
       user-select: none;
       -webkit-user-select: none;
       -webkit-touch-callout: none;
     }`,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTileHeaderComponent {}
