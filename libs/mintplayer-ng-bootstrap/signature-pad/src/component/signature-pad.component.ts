import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, ViewChild, signal, effect } from '@angular/core';
import { Signature } from '../interfaces/signature';

@Component({
  selector: 'bs-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
  standalone: true,
})
export class BsSignaturePadComponent implements AfterViewInit {
  constructor() {
    effect(() => {
      this.signatureChange.emit(this.signatureSignal());
    });
  }

  //#region Signature
  signatureSignal = signal<Signature>({ strokes: [] });
  @Input() set signature(val: Signature) {
    this.signatureSignal.set(val);
  }
  @Output() signatureChange = new EventEmitter<Signature>();
  //#endregion

  @Input() width = 500;
  @Input() height = 300;

  @HostBinding('class.border')
  @HostBinding('class.d-inline-block')
  classes = true;

  isDrawing = false;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  context: CanvasRenderingContext2D | null = null;

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.context = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }

  @HostBinding('style.min-height.rem') minHeight = 5;
  @HostListener('touchmove', ['$event']) onTouchMove(ev: TouchEvent) {
    if (this.isDrawing) {
      ev.preventDefault();
    }
  }
  @HostListener('pointerdown', ['$event']) onPointerStart(ev: PointerEvent) {
    ev.preventDefault();
    this.isDrawing = true;
    if (this.context) {
      const sig = this.signatureSignal();
      sig.strokes.push({
        points: [{ x: ev.offsetX, y: ev.offsetY }]
      });
      this.signatureSignal.set({ ...sig });

      this.context.fillStyle = 'black';
      this.context.beginPath();
      this.context.moveTo(ev.offsetX, ev.offsetY);
    }
  }
  @HostListener('pointermove', ['$event']) onPointerMove(ev: PointerEvent) {
    if (this.isDrawing && this.context) {
      ev.preventDefault();

      const sig = this.signatureSignal();
      sig.strokes.at(-1)?.points.push({ x: ev.offsetX, y: ev.offsetY });
      this.signatureSignal.set({ ...sig });

      this.context.lineTo(ev.offsetX, ev.offsetY);
      this.context.stroke();
    }
  }
  @HostListener('window:pointerup', ['$event']) onPointerEnd(ev: PointerEvent) {
    if (this.isDrawing && this.context) {
      ev.preventDefault();
      this.isDrawing = false;
    }
  }
}
