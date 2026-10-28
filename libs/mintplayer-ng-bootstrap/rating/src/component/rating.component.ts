import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, model, output, signal, untracked, viewChildren } from '@angular/core';
import { BsRatingValueAccessor } from '../value-accessor/rating-value-accessor';

@Component({
  selector: 'bs-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsRatingValueAccessor],
  host: {
    '[attr.aria-disabled]': 'disabled() || null',
    'role': 'radiogroup',
    '[attr.aria-label]': 'ariaLabel()',
    '(mouseleave)': 'onMouseLeave()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsRatingComponent {

  private readonly accessor = inject(BsRatingValueAccessor, { self: true });
  readonly disabled = this.accessor.disabled.asReadonly();

  constructor() {
    // A form write lands in the model without echoing back to the form.
    effect(() => {
      const written = this.accessor.written();
      if (written !== undefined) untracked(() => this.value.set(written));
    });
    effect(() => {
      const v = this.previewValue() ?? this.value();
      this.starsChange.emit(v);
    });
  }

  /** Accessible name for the radiogroup. Override for localisation. */
  ariaLabel = input<string>('Rating');
  /**
   * Per-star accessible name. A formatter, not a prefix/suffix pair, because
   * word order differs across languages and an interpolated middle cannot be
   * expressed any other way.
   */
  starLabel = input<(star: number, maximum: number) => string>(
    (star, maximum) => `Rate ${star} out of ${maximum} stars`,
  );

  maximum = input<number>(5);
  value = model<number>(3);
  previewValue = signal<number | null>(null);
  starsChange = output<number>();

  readonly starButtons = viewChildren<ElementRef<HTMLButtonElement>>('star');

  /**
   * Exactly one star must stay tabbable or the whole widget leaves the tab
   * order: with no value set, the old binding gave EVERY star tabindex="-1"
   * and the rating could never be entered by keyboard (the audit's bs-rating
   * Critical, and the reason RovingFocus's first-enabled fallback exists).
   */
  readonly starTabIndexes = computed(() => {
    const v = this.value();
    const max = this.maximum();
    return [...Array(max).keys()].map((i) => (v ? v === i + 1 : i === 0) ? 0 : -1);
  });

  /** Hoisted per the computed-over-inline-expression rule. */
  readonly starLabels = computed(() => {
    const format = this.starLabel();
    const max = this.maximum();
    return [...Array(max).keys()].map((i) => format(i + 1, max));
  });

  stars = computed(() => {
    const v = this.previewValue() ?? this.value();
    const max = this.maximum();
    return [
      ...[...Array(v).keys()].map(() => true),
      ...[...Array(max - v).keys()].map(() => false)
    ];
  });

  hoverValue(index: number) {
    if (this.disabled()) return;
    this.previewValue.set(index + 1);
  }

  selectValue(index: number) {
    this.pick(index + 1);
  }

  private pick(value: number) {
    this.value.set(value);
    this.accessor.changed(value);
  }

  onMouseLeave() {
    this.previewValue.set(null);
  }

  onKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;
    const max = this.maximum();
    const cur = this.value();
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = Math.min(cur + 1, max);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = Math.max(cur - 1, 1);
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next !== cur) {
      this.pick(next);
    }
    this.starButtons()[next - 1]?.nativeElement.focus();
  }
}
