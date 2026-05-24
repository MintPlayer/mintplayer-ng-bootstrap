import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  Renderer2,
  viewChild,
} from '@angular/core';
import { BsSelectValueAccessor } from '../value-accessors/select-value-accessor';
import { BsSelectSize } from '../types/select-size';
import type { MpSelect } from '@mintplayer/web-components/select';

// Side-effect import: registers <mp-select>.
import '@mintplayer/web-components/select';

@Component({
  selector: 'bs-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  hostDirectives: [{
    directive: forwardRef(() => BsSelectValueAccessor),
    inputs: ['compareWith'],
  }],
})
export class BsSelectComponent {
  private renderer = inject(Renderer2);

  constructor() {
    effect(() => {
      const el = this.selectBox()?.nativeElement;
      if (!el) return;
      el.size = this.size();
      el.multiple = this.multiple();
      el.numberVisible = this.numberVisible();
      el.disabled = this.disabled();
      const label = this.ariaLabel();
      if (label == null) this.renderer.removeAttribute(el, 'aria-label');
      else this.renderer.setAttribute(el, 'aria-label', label);
    });
  }

  // For debugging purposes
  identifier = input(0);

  /** Reference to the underlying `<mp-select>` WC. Read by
   *  `BsSelectValueAccessor` to drive `value` / `disabled` via property
   *  setters and listen for the bubbled, composed `change` event. */
  readonly selectBox = viewChild.required<ElementRef<MpSelect>>('selectBox');

  size = input<BsSelectSize>('md');
  multiple = input<boolean>(false);
  numberVisible = input<number | null>(null);
  disabled = input<boolean>(false);
  ariaLabel = input<string | null>(null);
}
