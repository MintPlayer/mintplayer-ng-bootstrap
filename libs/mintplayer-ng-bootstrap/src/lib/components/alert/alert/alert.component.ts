import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '../../../enums';

@Component({
  selector: 'bs-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  animations: [ FadeInOutAnimation ]
})
export class BsAlertComponent {

  @Input() public type: Color = Color.primary;
  colors = Color;

  //#region IsVisible
  private _isVisible = true;
  get isVisible() {
    return this._isVisible;
  }
  @Input() public set isVisible(value: boolean) {
    this._isVisible = value;
    this.isVisibleChange.emit(value);
  }
  @Output() isVisibleChange = new EventEmitter<boolean>();
  //#endregion

  @Output() afterOpenedOrClosed = new EventEmitter();
  onAfterOpenedOrClosed(isVisible: boolean) {
    this.afterOpenedOrClosed.emit(isVisible);
  }
}
