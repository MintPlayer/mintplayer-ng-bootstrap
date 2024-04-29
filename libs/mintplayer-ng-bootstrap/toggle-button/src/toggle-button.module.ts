import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsToggleButtonComponent } from './component/toggle-button.component';
import { BsToggleButtonValueAccessor } from './value-accessor/toggle-button-value-accessor';

@NgModule({
  declarations: [
    BsToggleButtonComponent,
    BsToggleButtonValueAccessor,
  ],
  imports: [
    CommonModule,
    BsFormCheckComponent
  ],
  exports: [
    BsToggleButtonComponent,
    BsToggleButtonValueAccessor
  ]
})
export class BsToggleButtonModule { }
