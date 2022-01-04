import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { ColorTransitionAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'bs-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  animations: [ ColorTransitionAnimation ]
})
export class BsToggleButtonComponent implements AfterViewInit {

  disableAnimations = true;
  ngAfterViewInit() {
    this.disableAnimations = false;
  }

  //#region isToggled
  _isToggled: boolean | null = false;
  @Output() public isToggledChange = new EventEmitter<boolean | null>();
  public get isToggled() {
    return this._isToggled;
  }
  @Input() public set isToggled(value: boolean | null) {
    this._isToggled = value;
    this.isToggledChange.emit(this._isToggled);
  }
  //#endregion

  @Input() public offColor = '#CCCCCC';
  @Input() public onColor = '#2196F3';
  @Input() public round = true;

}
