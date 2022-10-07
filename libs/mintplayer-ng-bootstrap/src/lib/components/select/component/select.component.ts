import { Component, ElementRef, Input, OnInit, Renderer2, ViewChild } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { BsSelectSize } from '../types/select-size';

@Component({
  selector: 'bs-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
})
export class BsSelectComponent implements OnInit {
  constructor(private renderer: Renderer2) {
    this.sizeClass$ = this.size$.pipe(map((size) => {
      switch (size) {
        case 'sm':
        case 'lg':
          return `form-select-${size}`;
        default:
          return null;
      }
    }));

    this.multipleValue$ = this.multiple$.pipe(map((multiple) => {
      if (multiple) {
        return true;
      } else {
        return null;
      }
    }));
  }

  // For debugging purposes
  @Input() public identifier = 0;

  @ViewChild('selectBox') selectBox!: ElementRef<HTMLSelectElement>; 

  ngOnInit(): void {}

  //#region Size
  size$ = new BehaviorSubject<BsSelectSize>('md');
  public get size() {
    return this.size$.value;
  }
  @Input() public set size(value: BsSelectSize) {
    this.size$.next(value);
  }
  //#endregion

  //#region Multiple
  multiple$ = new BehaviorSubject<boolean>(false);
  public get multiple() {
    return this.multiple$.value;
  }
  @Input() public set multiple(value: boolean) {
    this.multiple$.next(value);
  }
  //#endregion

  //#region NumberVisible
  numberVisible$ = new BehaviorSubject<number | null>(null);
  public get numberVisible() {
    return this.numberVisible$.value;
  }
  @Input() public set numberVisible(value: number | null) {
    this.numberVisible$.next(value);
  }
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

  sizeClass$: Observable<string | null>;
  multipleValue$: Observable<boolean | null>;
}
