import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
/**
 * `<bs-quick-access-toolbar>` — Angular wrapper for `<mp-quick-access-toolbar>`.
 *
 * Sibling to `<bs-ribbon>` — render above or below the ribbon in your app
 * shell. Slot accepts the same item children as a ribbon group (most commonly
 * `<bs-ribbon-button size="small">`).
 */
@Component({
  selector: 'bs-quick-access-toolbar',
  templateUrl: './quick-access-toolbar.component.html',
  styles: [`
    :host { display: block; }
  `],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsQuickAccessToolbarComponent {
  readonly label = input<string>('Quick Access Toolbar');
  readonly touchMode = input<'on' | 'off' | 'auto'>('auto');
  readonly appAccent = input<string | null>(null);
}
