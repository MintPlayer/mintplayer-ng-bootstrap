import { Component, HostBinding, Inject, Input, TemplateRef } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Component({
  selector: 'bs-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsTooltipComponent {
  constructor(@Inject(TOOLTIP_CONTENT) content: TemplateRef<any>) {
    this.template = content;  
    this.positionClass$ = this.position$
      .pipe(map(position => `bs-tooltip-${position}`));
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

  @HostBinding('class.position-relative') positionRelative = true;

}
