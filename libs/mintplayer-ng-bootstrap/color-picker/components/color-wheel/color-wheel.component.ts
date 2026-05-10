import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, signal, viewChild } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { hs2polar, polar2hs } from '../../color-math';

@Component({
  selector: 'bs-color-wheel',
  templateUrl: './color-wheel.component.html',
  styleUrls: ['./color-wheel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'position-relative',
    'role': 'application',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.tabindex]': 'disabled() ? -1 : 0',
    '(document:mousemove)': 'onPointerMove($event)',
    '(document:mouseup)': 'onPointerUp($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsColorWheelComponent {
  readonly surface = viewChild.required<ElementRef<HTMLDivElement>>('surface');

  width = model<number>(150);
  height = model<number>(150);
  brightness = model<number>(1);

  hs = model<HS>({ hue: 0, saturation: 0 });
  hsChange = output<HS>();

  disabled = input<boolean>(false);
  ariaLabel = input<string>('Color wheel: arrow left and right adjust hue, arrow up and down adjust saturation');
  private readonly isPointerDown = signal<boolean>(false);

  squareSize = computed(() => Math.min(this.width(), this.height()));
  shiftX = computed(() => Math.max(0, (this.width() - this.height()) / 2));
  shiftY = computed(() => Math.max(0, (this.height() - this.width()) / 2));
  outerRadius = computed(() => this.squareSize() / 2);

  overlayOpacity = computed(() => 1 - this.brightness());

  ariaValueText = computed(() => {
    const hs = this.hs();
    return `Hue ${Math.round(hs.hue)}°, saturation ${Math.round(hs.saturation * 100)}%`;
  });

  markerPosition = computed(() => {
    const hs = this.hs();
    const radius = this.outerRadius();
    const cx = this.shiftX() + radius;
    const cy = this.shiftY() + radius;
    const { dx, dy } = hs2polar(hs.hue, hs.saturation, radius);
    return { x: cx + dx, y: cy + dy };
  });

  constructor() {
    effect(() => {
      const hs = this.hs();
      this.hsChange.emit(hs);
    });
  }

  onPointerDown(ev: MouseEvent | TouchEvent) {
    if (this.disabled()) return;
    if (!('touches' in ev)) ev.preventDefault();
    ev.stopPropagation();
    this.isPointerDown.set(true);
    this.updateColor(ev);
  }

  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (!this.isPointerDown()) return;
    if (!('touches' in ev)) ev.preventDefault();
    ev.stopPropagation();
    this.updateColor(ev);
  }

  onPointerUp(_ev: MouseEvent | TouchEvent) {
    this.isPointerDown.set(false);
  }

  /**
   * Keyboard model for the 2-D wheel:
   *  ArrowLeft  / ArrowRight  → -1° / +1° hue          (Shift: stays 1° for "fine")
   *  ArrowDown / ArrowUp      → -1% / +1% saturation   (Shift: stays 1% for "fine")
   *  PageDown / PageUp        → -30° / +30° hue
   *  Home / End               → saturation 100% / 0%
   *
   * Hue wraps around; saturation clamps. Sighted-keyboard users get the same
   * wheel as mouse users; blind users typically prefer the channel sliders
   * (toggleable in bs-color-picker), since aria-valuetext on a 2-D widget is
   * harder to spatialise than two 1-D sliders.
   */
  onKeydown(ev: KeyboardEvent) {
    if (this.disabled()) return;
    const cur = this.hs();
    const hueStep = ev.shiftKey ? 1 : 5;
    const satStep = ev.shiftKey ? 0.01 : 0.05;
    let nextHue = cur.hue;
    let nextSat = cur.saturation;
    switch (ev.key) {
      case 'ArrowRight':
        nextHue = (cur.hue + hueStep) % 360;
        break;
      case 'ArrowLeft':
        nextHue = (cur.hue - hueStep + 360) % 360;
        break;
      case 'ArrowUp':
        nextSat = Math.min(1, cur.saturation + satStep);
        break;
      case 'ArrowDown':
        nextSat = Math.max(0, cur.saturation - satStep);
        break;
      case 'PageUp':
        nextHue = (cur.hue + 30) % 360;
        break;
      case 'PageDown':
        nextHue = (cur.hue - 30 + 360) % 360;
        break;
      case 'Home':
        nextSat = 1;
        break;
      case 'End':
        nextSat = 0;
        break;
      default:
        return;
    }
    ev.preventDefault();
    if (nextHue !== cur.hue || nextSat !== cur.saturation) {
      this.hs.set({ hue: nextHue, saturation: nextSat });
    }
  }

  private updateColor(ev: MouseEvent | TouchEvent) {
    const rect = this.surface().nativeElement.getBoundingClientRect();
    const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
    const clientY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;

    const radius = this.outerRadius();
    const dx = clientX - rect.left - radius;
    const dy = clientY - rect.top - radius;

    const hs = polar2hs(dx, dy, radius);
    this.hs.set(hs);
  }
}
