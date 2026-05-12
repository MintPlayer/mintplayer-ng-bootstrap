import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'bs-ribbon-gallery-item',
  template: `
    <mp-ribbon-gallery-item
      [attr.item-id]="itemId()"
      [attr.label]="label()"
      [attr.icon]="icon()"
      [attr.selected]="selected() ? '' : null"
      [attr.disabled]="disabled() ? '' : null"
      (gallery-select)="onSelect($event)"
    ></mp-ribbon-gallery-item>
  `,
  styles: [`:host { display: inline-flex; }`],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonGalleryItemComponent {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly icon = input<string>('');
  readonly selected = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly gallerySelect = output<{ itemId: string }>();

  onSelect(event: Event): void {
    this.gallerySelect.emit(
      (event as CustomEvent<{ itemId: string }>).detail
    );
  }
}
