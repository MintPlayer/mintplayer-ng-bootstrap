import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsToggleButtonGroupMockDirective } from '../directives/toggle-button-group.directive';
import { BsCheckStyleMock } from '../types/check-style';

@Component({
  selector: 'bs-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  providers: [
    { provide: BsToggleButtonComponent, useExisting: BsToggleButtonMockComponent }
  ]
})
export class BsToggleButtonMockComponent {
  @Output() public isToggledChange = new EventEmitter<boolean | null>();
  @Input() public isToggled: boolean | null = false;
  @Input() public round = true;
  @Input() public disabled = false;
  @Input() public group: BsToggleButtonGroupMockDirective | null = null;
  @Input() public type: BsCheckStyleMock = 'checkbox';
  @Input() public value: string | null = null;
  @Input() public name: string | null = null;
}
