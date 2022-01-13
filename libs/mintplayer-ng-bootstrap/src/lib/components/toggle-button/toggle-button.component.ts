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

  //#region isToggled
  _isToggled: boolean | null = false;
  @Output() public change = new EventEmitter<boolean | null>();
  @Output() public isToggledChange = new EventEmitter<boolean | null>();
  public get isToggled() {
    return this._isToggled;
  }
  @Input() public set isToggled(value: boolean | null) {
    this._isToggled = value;
    this.isToggledChange.emit(this._isToggled);
  }
  //#endregion

  //#region disabled
  @Input() public disabled = false;
  //#endregion

  onChange(event: Event) {
    const val = (<any>event.target).checked;
    this.isToggled = val;
    this.change.emit(val);
  }
  
  ngAfterViewInit() {
    this.disableAnimations = false;
  }

}
