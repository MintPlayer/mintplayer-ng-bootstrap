import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, Renderer2, viewChild } from '@angular/core';
import { BsSelectSize } from '../types/select-size';

@Component({
  selector: 'bs-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSelectComponent {
  private renderer = inject(Renderer2);

  constructor() {
    effect(() => {
      const disabled = this.disabled();
      const selectBox = this.selectBox();
      if (selectBox) {
        this.renderer.setProperty(selectBox.nativeElement, 'disabled', disabled);
      }
    });
  }

  // For debugging purposes
  identifier = input(0);

  readonly selectBox = viewChild.required<ElementRef<HTMLSelectElement>>('selectBox');

  size = input<BsSelectSize>('md');
  multiple = input<boolean>(false);
  numberVisible = input<number | null>(null);
  disabled = input<boolean>(false);

  sizeClass = computed(() => {
    const size = this.size();
    switch (size) {
      case 'sm':
      case 'lg':
        return `form-select-${size}`;
      default:
        return null;
    }
  });

  multipleValue = computed(() => {
    if (this.multiple()) {
      return true;
    } else {
      return null;
    }
  });
}
