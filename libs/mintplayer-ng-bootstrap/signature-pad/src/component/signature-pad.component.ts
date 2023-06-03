import { AfterViewInit, Component, ElementRef, HostBinding, HostListener, ViewChild } from '@angular/core';
import { SignatureData } from '../interfaces/signature-data';
import { BehaviorSubject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Point } from '../interfaces/point';

@Component({
  selector: 'bs-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
})
export class BsSignaturePadComponent implements AfterViewInit {
  // constructor() {
  //   this.data$.pipe(takeUntilDestroyed()).subscribe((data) => {

  //   });
  // }

  @HostBinding('class.border')
  @HostBinding('class.d-block')
  classes = true;

  isDrawing = false;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  context: CanvasRenderingContext2D | null = null;
  // data$ = new BehaviorSubject<SignatureData>({ strokes: [] });

  ngAfterViewInit() {
    this.context = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
  }

  points: Point[] = [];
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
      console.log('pointer down', ev);
      this.points.push({ x: ev.offsetX, y: ev.offsetY });
      this.context.moveTo(ev.offsetX, ev.offsetY);
      this.context.fillStyle = 'black';
      this.context.beginPath();
    }
  }
  @HostListener('pointermove', ['$event']) onPointerMove(ev: PointerEvent) {
    if (this.isDrawing && this.context) {
      ev.preventDefault();
      console.log('pointer move', ev);
      
      this.context.moveTo(this.points.at(-1)!.x, this.points.at(-1)!.y);
      // ctx.arc(x, y, width, 0, 2 * Math.PI, false);
      // this.context.arc(ev.offsetX, ev.offsetY, 2, 0, 2 * Math.PI, false);
      // this.context.arcTo(ev.offsetX, ev.offsetY,)
      this.context.closePath();
      this.context.fill();

      this.points.push({ x: ev.offsetX, y: ev.offsetY });
    }
  }
  @HostListener('pointerup', ['$event']) onPointerEnd(ev: PointerEvent) {
    if (this.isDrawing && this.context) {
      ev.preventDefault();
      this.isDrawing = false;
      console.log('pointer up', ev);
    }
  }
}
