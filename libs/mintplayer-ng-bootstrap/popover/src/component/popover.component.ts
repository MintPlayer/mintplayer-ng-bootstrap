import { Component, HostBinding, Inject, Input, TemplateRef, signal, computed } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { POPOVER_CONTENT } from '../providers/popover-content.provider';

@Component({
  selector: 'bs-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation],
})
export class BsPopoverComponent {
  constructor(@Inject(POPOVER_CONTENT) content: TemplateRef<any>) {
    this.template = content;
    this.marginClass = computed(() => {
      const position = this.positionSignal();
      switch (position) {
        case 'top': return 'mb-2';
        case 'start': return 'me-2';
        case 'end': return 'ms-2';
        default: return 'mt-2';
      }
    });
    this.positionClass = computed(() => `bs-popover-${this.positionSignal()}`);
  }

  //#region Position
  positionSignal = signal<Position>('bottom');
  public get position() {
    return this.positionSignal();
  }
  @Input() public set position(value: Position) {
    this.positionSignal.set(value);
  }
  //#endregion
  //#region IsVisible
  isVisibleSignal = signal<boolean>(false);
  public get isVisible() {
    return this.isVisibleSignal();
  }
  @Input() public set isVisible(value: boolean) {
    this.isVisibleSignal.set(value);
  }
  //#endregion

  marginClass;
  positionClass;

  template: TemplateRef<any>;

  @HostBinding('class.position-relative') positionRelative = true;
}
