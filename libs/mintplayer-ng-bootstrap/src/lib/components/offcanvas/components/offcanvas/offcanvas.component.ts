import { Component, HostBinding, Inject, Input, TemplateRef } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { OffcanvasPosition } from '../../types/position';
import { OffcanvasAnimationMeta } from '../../interfaces';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';

@Component({
  selector: 'bs-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
})
export class BsOffcanvasComponent {

  constructor(@Inject(OFFCANVAS_CONTENT) content: TemplateRef<any>) {
    this.content = content;
    this.offcanvasClass$ = this.position$
      .pipe(map((pos) => `offcanvas-${pos}`));
    this.offcanvasHeight100$ = this.position$
      .pipe(map((pos) => {
        switch (this.position) {
          case 'top':
          case 'bottom':
            return false;
          default:
            return true;
        }
      }));
  }

  @Input() public size: number | null = null;
  @HostBinding('class.d-block') displayBlock = true;
  @HostBinding('class.position-absolute') positionAbsolute = true;
  
  content: TemplateRef<any>;
  private instance: OffcanvasAnimationMeta | null = null;
  
  show$ = new BehaviorSubject<boolean>(false);
  position$ = new BehaviorSubject<OffcanvasPosition>('bottom');
  offcanvasClass$: Observable<string>;
  offcanvasHeight100$: Observable<boolean>;

  //#region Position
  public set position(value: OffcanvasPosition) {
    this.position$.next(value);
  }
  public get position() {
    return this.position$.value;
  }
  //#endregion

}
