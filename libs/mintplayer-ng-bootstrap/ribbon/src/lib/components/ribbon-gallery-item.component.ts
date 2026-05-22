import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
@Component({
  selector: 'bs-ribbon-gallery-item',
  templateUrl: './ribbon-gallery-item.component.html',
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
