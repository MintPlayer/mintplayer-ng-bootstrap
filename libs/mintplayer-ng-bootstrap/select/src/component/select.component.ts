import { Component, ElementRef, Input, OnInit, Renderer2, ViewChild, signal, computed } from '@angular/core';
import { BsSelectSize } from '../types/select-size';

@Component({
  selector: 'bs-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  standalone: false,
})
export class BsSelectComponent implements OnInit {
  constructor(private renderer: Renderer2) {
    this.sizeClass = computed(() => {
      const size = this.size();
      switch (size) {
        case 'sm':
        case 'lg':
          return `form-select-${size}`;
        default:
          return null;
      }
    });

    this.multipleValue = computed(() => {
      const multiple = this.multiple();
      if (multiple) {
        return true;
      } else {
        return null;
      }
    });
  }

  // For debugging purposes
  @Input() public identifier = 0;

  @ViewChild('selectBox') selectBox!: ElementRef<HTMLSelectElement>;

  ngOnInit(): void {}

  //#region Size
  size = signal<BsSelectSize>('md');
  //#endregion

  //#region Multiple
  multiple = signal<boolean>(false);
  //#endregion

  //#region NumberVisible
  numberVisible = signal<number | null>(null);
  //#endregion

  //#region Disabled
  public get disabled() {
    return this.selectBox!.nativeElement.disabled;
  }
  @Input() public set disabled(value: boolean) {
    if (this.selectBox) {
      this.renderer.setProperty(this.selectBox.nativeElement, 'disabled', value);
    }
  }
  //#endregion

  sizeClass;
  multipleValue;
}
