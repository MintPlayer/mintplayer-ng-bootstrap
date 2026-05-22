import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
@Component({
  selector: 'bs-ribbon-split-button',
  templateUrl: './ribbon-split-button.component.html',
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
    '[attr.data-size]': 'size()',
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
