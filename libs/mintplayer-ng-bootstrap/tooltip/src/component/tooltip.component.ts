import { Component, HostBinding, Inject, Input, TemplateRef, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Component({
  selector: 'bs-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None,
  animations: [FadeInOutAnimation],
})
export class BsTooltipComponent {
  constructor(@Inject(TOOLTIP_CONTENT) content: TemplateRef<any>) {
    this.template = content;  
    this.positionClass$ = this.position$
      .pipe(map(position => `bs-tooltip-${position}`));
    this.marginClass$ = this.position$
      .pipe(map(position => {
        switch (position) {
          case 'start': return 'me-1';
          case 'end': return 'ms-1';
          case 'top': return 'mb-1';
          case 'bottom': return 'mt-1';
        }
      }));
  }

  //#region Position
  position$ = new BehaviorSubject<Position>('bottom');
  public get position() {
    return this.position$.value;
  }
  @Input() public set position(value: Position) {
    this.position$.next(value);
  }
  //#endregion

  template: TemplateRef<any>;
  positionClass$: Observable<string>;
  marginClass$: Observable<string>;

  @HostBinding('class.position-relative') positionRelative = true;

}
