import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'bs-ribbon-button',
  template: `
    <mp-ribbon-button
      [attr.item-id]="itemId()"
      [attr.label]="label()"
      [attr.icon]="icon()"
      [attr.size]="size()"
      [attr.disabled]="disabled() ? '' : null"
      [attr.tooltip]="tooltip()"
      (item-click)="onItemClick($event)"
    ></mp-ribbon-button>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonButtonComponent {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly icon = input<string>('');
  readonly size = input<'large' | 'medium' | 'small'>('medium');
  readonly disabled = input<boolean>(false);
  readonly tooltip = input<string>('');

  readonly itemClick = output<{ itemId: string }>();

  onItemClick(event: CustomEvent<{ itemId: string }>): void {
    this.itemClick.emit(event.detail);
  }
}
