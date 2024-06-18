import { ContentChildren, Directive, Input, QueryList, forwardRef } from '@angular/core';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsRadioButtonComponent } from '@mintplayer/ng-bootstrap/radio-button';
import { BsRadioToggleButtonComponent } from '@mintplayer/ng-bootstrap/radio-toggle-button';
import { BsSwitchComponent } from '@mintplayer/ng-bootstrap/switch';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Directive({
  selector: '[bsCheckGroup]',
})
export class BsCheckGroupDirective {
  @Input() name?: string;

  @ContentChildren(forwardRef(() => BsCheckboxComponent)) checkboxes!: QueryList<BsCheckboxComponent>;
  @ContentChildren(forwardRef(() => BsToggleButtonComponent)) toggleButtons!: QueryList<BsToggleButtonComponent>;
  @ContentChildren(forwardRef(() => BsSwitchComponent)) switches!: QueryList<BsSwitchComponent>;
  @ContentChildren(forwardRef(() => BsRadioButtonComponent)) radios!: QueryList<BsRadioButtonComponent>;
  @ContentChildren(forwardRef(() => BsRadioToggleButtonComponent)) radioToggleButtons!: QueryList<BsRadioToggleButtonComponent>;

  public setValue(value?: any) {
    if (this.checkboxes && this.checkboxes.length) {
      if (!Array.isArray(value)) {
        console.warn('value', value);
        throw 'bsCheckGroup: checkboxes - value should be an array';
      }

      this.checkboxes.forEach((chk) => {
        chk.isChecked = value.includes(chk.value);
      });
    } else if (this.toggleButtons && this.toggleButtons.length) {
      if (!Array.isArray(value)) {
        throw 'bsCheckGroup: toggleButtons - value should be an array';
      }

      this.toggleButtons.forEach((chk) => {
        chk.isToggled = value.includes(chk.value);
      });
    } else if (this.switches && this.switches.length) {
      if (!Array.isArray(value)) {
        throw 'bsCheckGroup: switches - value should be an array';
      }

      this.switches.forEach((chk) => {
        chk.isToggled = value.includes(chk.value);
      });
    } else if (this.radios && this.radios.length) {
      if (Array.isArray(value)) {
        throw 'bsCheckGroup: radios - value should not be an array';
      }

      this.radios.filter(rad => rad.value === value)
        .forEach(rad => rad.isChecked = true);
    } else if (this.radioToggleButtons && this.radioToggleButtons.length) {
      if (Array.isArray(value)) {
        throw 'bsCheckGroup: radioToggleButtons - value should not be an array';
      }

      this.radioToggleButtons.filter(rad => rad.value === value)
        .forEach(rad => rad.isChecked = true);
    }
  }

  public setDisabled(isDisabled: boolean) {
    if (this.checkboxes && this.checkboxes.length) {
      this.checkboxes.forEach(chk => chk.isEnabled = !isDisabled);
    } else if (this.toggleButtons && this.toggleButtons.length) {
      this.toggleButtons.forEach(btn => btn.isEnabled = !isDisabled);
    } else if (this.switches && this.switches.length) {
      this.switches.forEach(sw => sw.isEnabled = !isDisabled);
    } else if (this.radios && this.radios.length) {
      this.radios.forEach(rad => rad.isEnabled = !isDisabled);
    } else if (this.radioToggleButtons && this.radioToggleButtons.length) {
      this.radioToggleButtons.forEach(rad => rad.isEnabled = !isDisabled);
    }
  }
}
