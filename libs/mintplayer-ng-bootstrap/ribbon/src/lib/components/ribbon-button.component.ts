import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
@Component({
  selector: 'bs-ribbon-button',
  templateUrl: './ribbon-button.component.html',
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
    '[attr.data-size]': 'size()',
  },
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

  onItemClick(event: Event): void {
    this.itemClick.emit((event as CustomEvent<{ itemId: string }>).detail);
  }
}
