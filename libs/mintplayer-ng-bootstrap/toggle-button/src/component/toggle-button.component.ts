import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, Output, ViewChild, signal, computed } from '@angular/core';
import { BsToggleButtonGroupDirective } from '../directives/toggle-button-group/toggle-button-group.directive';
import { BsCheckStyle } from '../types/check-style';

@Component({
  selector: 'bs-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  standalone: false,
})
export class BsToggleButtonComponent implements AfterViewInit {

  constructor() {
    this.mainCheckStyle = computed(() => {
      const type = this.typeSignal();
      switch (type) {
        case 'checkbox':
        case 'radio':
        case 'switch':
          return 'form-check';
        default:
          return null;
      }
    });

    this.isSwitch = computed(() => {
      const type = this.typeSignal();
      switch (type) {
        case 'switch':
          return true;
        default:
          return false;
      }
    });

    this.inputClass = computed(() => {
      const type = this.typeSignal();
      switch (type) {
        case 'checkbox':
        case 'radio':
        case 'switch':
          return 'form-check-input';
        default:
          return 'btn-check';
      }
    });

    this.labelClass = computed(() => {
      const type = this.typeSignal();
      switch (type) {
        case 'checkbox':
        case 'radio':
        case 'switch':
          return 'form-check-label';
        case 'toggle_button':
          return 'btn btn-primary'
        case 'radio_toggle_button':
          return 'btn btn-secondary';
      }
    });

    this.checkOrRadio = computed(() => {
      const type = this.typeSignal();
      switch (type) {
        case 'radio':
        case 'radio_toggle_button':
          return 'radio';
        default:
          return 'checkbox';
      }
    });

    this.nameResult = computed(() => {
      const name = this.nameSignal();
      const type = this.typeSignal();
      const group = this.groupSignal();
      switch (type) {
        case 'radio':
        case 'radio_toggle_button':
            return name;
        case 'checkbox':
        case 'toggle_button':
        case 'switch':
          if (group) {
            return `${name}[]`;
          } else {
            return name;
          }
        default:
          throw 'Invalid value';
      }
    });
  }

  @ViewChild('checkbox') checkbox!: ElementRef<HTMLInputElement>;
  @HostBinding('class.d-inline-block') dInlineBlockClass = true;

  disableAnimations = true;
  mainCheckStyle;
  isSwitch;
  inputClass;
  labelClass;
  checkOrRadio;
  nameResult;

  //#region Type
  typeSignal = signal<BsCheckStyle>('checkbox');
  @Input() set type(val: BsCheckStyle) {
    this.typeSignal.set(val);
  }
  //#endregion

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

  //#region name
  nameSignal = signal<string | null>(null);
  @Input() set name(val: string | null) {
    this.nameSignal.set(val);
  }
  //#endregion

  //#region value
  valueSignal = signal<string | null>(null);
  @Input() set value(val: string | null) {
    this.valueSignal.set(val);
  }
  //#endregion

  //#region Group
  groupSignal = signal<BsToggleButtonGroupDirective | null>(null);
  @Input() set group(val: BsToggleButtonGroupDirective | null) {
    this.groupSignal.set(val);
  }
  //#endregion

  ngAfterViewInit() {
    this.disableAnimations = false;
  }

}
