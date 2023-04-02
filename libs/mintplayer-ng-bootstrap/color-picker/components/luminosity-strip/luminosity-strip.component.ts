import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HS } from '../../interfaces/hs';

@Component({
  selector: 'bs-luminosity-strip',
  templateUrl: './luminosity-strip.component.html',
  styleUrls: ['./luminosity-strip.component.scss']
})
export class BsLuminosityStripComponent {
  //#region HS
  hs$ = new BehaviorSubject<HS>({ hue: 0, saturation: 0 });
  public get hs() {
    return this.hs$.value;
  }
  @Input() public set hs(value: HS) {
    this.hs$.next(value);
  }
  //#endregion
  //#region Luminosity
  luminosity$ = new BehaviorSubject<number>(0.5);
  @Output() luminosityChange = new EventEmitter<number>();
  public get luminosity() {
    return this.luminosity$.value;
  }
  @Input() public set luminosity(value: number) {
    this.luminosity$.next(value);
  }
  //#endregion
}
