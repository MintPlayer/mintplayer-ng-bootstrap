import { NgModule } from '@angular/core';
import { BsAlertComponent } from './alert/alert.component';
import { BsAlertCloseComponent } from './alert-close/alert-close.component';

@NgModule({
  declarations: [
    BsAlertComponent,
    BsAlertCloseComponent
  ],
  exports: [
    BsAlertComponent,
    BsAlertCloseComponent
  ]
})
export class BsAlertModule {}
