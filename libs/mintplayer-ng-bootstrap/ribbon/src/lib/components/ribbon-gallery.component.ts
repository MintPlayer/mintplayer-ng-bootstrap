import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
@Component({
  selector: 'bs-ribbon-gallery',
  template: `
    <mp-ribbon-gallery
      [attr.item-id]="itemId()"
      [attr.label]="label()"
      [attr.size]="size()"
      [attr.columns]="columns()"
    >
      <ng-content></ng-content>
    </mp-ribbon-gallery>
  `,
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
    '[attr.data-size]': 'size()',
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonGalleryComponent {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly size = input<'large' | 'medium' | 'small'>('medium');
  readonly columns = input<number>(4);
}
