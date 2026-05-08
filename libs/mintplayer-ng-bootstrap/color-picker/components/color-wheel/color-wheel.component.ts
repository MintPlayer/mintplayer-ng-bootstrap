import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { hs2polar, polar2hs } from '../../color-math';

@Component({
  selector: 'bs-color-wheel',
  templateUrl: './color-wheel.component.html',
  styleUrls: ['./color-wheel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'position-relative',
    '(document:mousemove)': 'onPointerMove($event)',
    '(document:mouseup)': 'onPointerUp($event)',
  },
})
export class BsColorWheelComponent {
  private element = inject(ElementRef<HTMLElement>);
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  width = model<number>(150);
  height = model<number>(150);
  brightness = model<number>(1);

  hs = model<HS>({ hue: 0, saturation: 0 });
  hsChange = output<HS>();

  disabled = input<boolean>(false);
  viewInited = signal<boolean>(false);
  private readonly isPointerDown = signal<boolean>(false);
  private readonly dpr = signal<number>(1);
  private canvasContext: CanvasRenderingContext2D | null = null;

  squareSize = computed(() => Math.min(this.width(), this.height()));
  shiftX = computed(() => Math.max(0, (this.width() - this.height()) / 2));
  shiftY = computed(() => Math.max(0, (this.height() - this.width()) / 2));
  outerRadius = computed(() => this.squareSize() / 2);

  canvasPixelWidth = computed(() => this.width() * this.dpr());
  canvasPixelHeight = computed(() => this.height() * this.dpr());

  overlayOpacity = computed(() => 1 - this.brightness());

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
      const radius = this.outerRadius();
      const dpr = this.dpr();
      const shiftX = this.shiftX();
      const shiftY = this.shiftY();
      const ctx = this.canvasContext;
      if (!ctx || radius <= 0) return;

      const widthCss = this.width();
      const heightCss = this.height();
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, widthCss, heightCss);
      ctx.translate(shiftX + radius, shiftY + radius);

      const stripHeight = Math.max(2, radius / 25);
      const stripsPerDegree = 2;
      const totalStrips = 360 * stripsPerDegree;
      const angleStep = (Math.PI / 180) / stripsPerDegree;

      for (let i = 0; i < totalStrips; i++) {
        const hue = i / stripsPerDegree;
        const gradient = ctx.createLinearGradient(0, 0, radius, 0);
        gradient.addColorStop(0, `hsl(${hue}, 100%, 100%)`);
        gradient.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, -stripHeight / 2, radius, stripHeight);
        ctx.rotate(angleStep);
      }

      ctx.restore();
    });

    effect(() => {
      const hs = this.hs();
      this.hsChange.emit(hs);
    });
  }

  ngAfterViewInit() {
    this.viewInited.set(true);
    if (typeof window !== 'undefined') {
      this.dpr.set(window.devicePixelRatio || 1);
      this.canvasContext = this.canvas().nativeElement.getContext('2d');
    }
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

  private updateColor(ev: MouseEvent | TouchEvent) {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
    const clientY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;

    const radius = this.outerRadius();
    const cx = this.shiftX() + radius;
    const cy = this.shiftY() + radius;
    const dx = clientX - rect.left - cx;
    const dy = clientY - rect.top - cy;

    const hs = polar2hs(dx, dy, radius);
    this.hs.set(hs);
  }
}
