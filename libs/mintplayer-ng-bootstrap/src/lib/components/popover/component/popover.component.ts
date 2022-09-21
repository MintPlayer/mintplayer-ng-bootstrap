import { Component, HostBinding, Inject, Input, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Position } from '../../../enums';
import { POPOVER_CONTENT } from '../providers/popover-content.provider';

@Component({
  selector: 'bs-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsPopoverComponent {
  constructor(@Inject(POPOVER_CONTENT) content: TemplateRef<any>) {
    this.template = content;
    this.marginClass$ = this.position$.pipe(map((position) => {
      switch (position) {
        case Position.top: return 'mb-2';
        case Position.left: return 'me-2';
        case Position.right: return 'ms-2';
        default: return 'mt-2';
      }
    }));
  }

  //#region Position
  positions = Position;
  position$ = new BehaviorSubject<Position>(Position.bottom);
  public get position() {
    return this.position$.value;
  }
  @Input() public set position(value: Position) {
    this.position$.next(value);
  }
  //#endregion
  //#region IsVisible
  isVisible$ = new BehaviorSubject<boolean>(false);
  public get isVisible() {
    return this.isVisible$.value;
  }
  @Input() public set isVisible(value: boolean) {
    this.isVisible$.next(value);
  }
  //#endregion

  marginClass$: Observable<string>;

  template: TemplateRef<any>;

  @HostBinding('class.position-relative') positionRelative = true;
}
