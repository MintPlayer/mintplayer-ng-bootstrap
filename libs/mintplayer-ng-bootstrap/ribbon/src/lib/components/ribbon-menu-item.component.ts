import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
@Component({
  selector: 'bs-ribbon-menu-item',
  template: `
    <mp-ribbon-menu-item
      [attr.item-id]="itemId()"
      [attr.label]="label()"
      [attr.icon]="icon()"
      [attr.kind]="kind()"
      [attr.checked]="checked() ? '' : null"
      [attr.disabled]="disabled() ? '' : null"
      (menu-select)="onMenuSelect($event)"
    >
      <ng-content></ng-content>
    </mp-ribbon-menu-item>
  `,
  host: {
    '[attr.slot]': "'menu'",
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonMenuItemComponent {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly icon = input<string>('');
  readonly kind = input<'action' | 'checkbox' | 'radio'>('action');
  readonly checked = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly menuSelect = output<{ itemId: string; checked: boolean }>();

  onMenuSelect(event: Event): void {
    this.menuSelect.emit(
      (event as CustomEvent<{ itemId: string; checked: boolean }>).detail
    );
  }
}
