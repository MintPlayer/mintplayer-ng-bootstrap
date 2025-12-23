import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, Renderer2, ViewChild } from '@angular/core';
import { BsSelectSize } from '../types/select-size';

@Component({
  selector: 'bs-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSelectComponent {
  constructor(private renderer: Renderer2) {
    effect(() => {
      const disabled = this.disabled();
      if (this.selectBox) {
        this.renderer.setProperty(this.selectBox.nativeElement, 'disabled', disabled);
      }
    });
  }

  // For debugging purposes
  identifier = input(0);

  @ViewChild('selectBox') selectBox!: ElementRef<HTMLSelectElement>;

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
