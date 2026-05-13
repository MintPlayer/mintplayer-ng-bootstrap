import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Styling-only wrapper. Imports the Bootstrap `form-check` SCSS module via
 * `:host ::ng-deep` so any descendant matching `.form-check`, `.form-check-input`,
 * `.form-check-label`, `.form-switch`, `.btn-check`, etc. picks up the framework
 * styles. Used internally by `<bs-checkbox>` and `<bs-radio>` to project the
 * actual `<label>` / `<input>` scaffolding while inheriting the styles.
 *
 * Direct consumer use is not supported — the component has no inputs, no
 * behaviour, and is published only because the new public components need to
 * reference it in their templates.
 */
@Component({
  selector: 'bs-toggle-button',
  template: '<ng-content></ng-content>',
  styleUrls: ['./toggle-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'class': 'd-inline-block' },
})
export class BsToggleButtonComponent {}
