import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, ViewChild } from '@angular/core';
import { Signature } from '../interfaces/signature';
import { BehaviorSubject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Point } from '../interfaces/point';
import { Stroke } from '../interfaces/stroke';

@Component({
  selector: 'bs-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
})
export class BsSignaturePadComponent implements AfterViewInit {
  constructor() {
    this.signature$.pipe(takeUntilDestroyed()).subscribe((signature) => {
      this.signatureChange.emit(signature);
    });
  }

  //#region Signature
  signature$ = new BehaviorSubject<Signature>({ strokes: [] });
  @Output() signatureChange = new EventEmitter<Signature>();
  public get signature() {
    return this.signature$.value;
  }
  @Input() public set signature(value: Signature) {
    this.signature$.next(value);
  }
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
    this.context = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
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
      this.signature.strokes.push({
        points: [{ x: ev.offsetX, y: ev.offsetY }]
      });
      this.signatureChange.emit(this.signature);

      this.context.fillStyle = 'black';
      this.context.beginPath();
      this.context.moveTo(ev.offsetX, ev.offsetY);
    }
  }
  @HostListener('pointermove', ['$event']) onPointerMove(ev: PointerEvent) {
    if (this.isDrawing && this.context) {
      ev.preventDefault();
      
      // this.context.moveTo(this.points.at(-1)!.x, this.points.at(-1)!.y);
      // // ctx.arc(x, y, width, 0, 2 * Math.PI, false);
      // // this.context.arc(ev.offsetX, ev.offsetY, 2, 0, 2 * Math.PI, false);
      // // this.context.arcTo(ev.offsetX, ev.offsetY,)
      // this.context.closePath();
      // this.context.fill();

      this.signature.strokes.at(-1)?.points.push({ x: ev.offsetX, y: ev.offsetY });
      this.signatureChange.emit(this.signature);

      this.context.lineTo(ev.offsetX, ev.offsetY);
      this.context.stroke();
    }
  }
  @HostListener('window:pointerup', ['$event']) onPointerEnd(ev: PointerEvent) {
    if (this.isDrawing && this.context) {
      ev.preventDefault();
      this.isDrawing = false;
      this.signatureChange.emit(this.signature);
    }
  }
}
