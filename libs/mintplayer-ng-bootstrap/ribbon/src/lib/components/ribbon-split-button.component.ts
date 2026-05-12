import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'bs-ribbon-split-button',
  template: `
    <mp-ribbon-split-button
      [attr.item-id]="itemId()"
      [attr.label]="label()"
      [attr.icon]="icon()"
      [attr.size]="size()"
      [attr.disabled]="disabled() ? '' : null"
      [attr.tooltip]="tooltip()"
      (main-action)="onMainAction($event)"
      (menu-toggle)="onMenuToggle($event)"
    >
      <ng-content></ng-content>
    </mp-ribbon-split-button>
  `,
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonSplitButtonComponent {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly icon = input<string>('');
  readonly size = input<'large' | 'medium' | 'small'>('medium');
  readonly disabled = input<boolean>(false);
  readonly tooltip = input<string>('');

  readonly mainAction = output<{ itemId: string }>();
  readonly menuToggle = output<{ itemId: string; open: boolean }>();

  onMainAction(event: Event): void {
    this.mainAction.emit((event as CustomEvent<{ itemId: string }>).detail);
  }

  onMenuToggle(event: Event): void {
    this.menuToggle.emit(
      (event as CustomEvent<{ itemId: string; open: boolean }>).detail
    );
  }
}
