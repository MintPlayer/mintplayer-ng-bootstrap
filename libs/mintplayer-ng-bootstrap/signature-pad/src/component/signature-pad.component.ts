import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, input, model, viewChild } from '@angular/core';
import { Signature } from '../interfaces/signature';

@Component({
  selector: 'bs-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'border d-inline-block',
    '[style.min-height.rem]': 'minHeight',
    '(touchmove)': 'onTouchMove($event)',
    '(pointerdown)': 'onPointerStart($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(window:pointerup)': 'onPointerEnd($event)',
  },
})
export class BsSignaturePadComponent implements AfterViewInit {

  signature = model<Signature>({ strokes: [] });
  width = input(500);
  height = input(300);

  minHeight = 5;
  isDrawing = false;
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  context: CanvasRenderingContext2D | null = null;

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.context = this.canvas().nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }

  onTouchMove(ev: TouchEvent) {
    if (this.isDrawing) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  onPointerStart(ev: PointerEvent) {
    ev.preventDefault();
    this.isDrawing = true;
    if (this.context) {
      const sig = this.signature();
      sig.strokes.push({
        points: [{ x: ev.offsetX, y: ev.offsetY }]
      });
      this.signature.set({ ...sig });

      this.context.fillStyle = 'black';
      this.context.beginPath();
      this.context.moveTo(ev.offsetX, ev.offsetY);
    }
  }

  onPointerMove(ev: PointerEvent) {
    if (this.isDrawing && this.context) {
      ev.preventDefault();

      const sig = this.signature();
      sig.strokes.at(-1)?.points.push({ x: ev.offsetX, y: ev.offsetY });
      this.signature.set({ ...sig });

      this.context.lineTo(ev.offsetX, ev.offsetY);
      this.context.stroke();
    }
  }

  onPointerEnd(ev: PointerEvent) {
    if (this.isDrawing && this.context) {
      ev.preventDefault();
      this.isDrawing = false;
    }
  }
}
