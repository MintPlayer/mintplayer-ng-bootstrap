import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAlertMockComponent } from './alert/alert.component';
import { BsAlertCloseMockComponent } from './alert-close/alert-close.component';
import { BsAlertCloseComponent, BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';

@NgModule({
  declarations: [BsAlertMockComponent, BsAlertCloseMockComponent],
  imports: [CommonModule],
  exports: [BsAlertMockComponent, BsAlertCloseMockComponent],
  providers: [
    { provide: BsAlertComponent, useClass: BsAlertMockComponent },
    { provide: BsAlertCloseComponent, useClass: BsAlertCloseMockComponent }
  ]
})
export class BsAlertTestingModule {}
