import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FullcalendarComponent } from './fullcalendar.component';

const routes: Routes = [{ path: '', component: FullcalendarComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FullcalendarRoutingModule { }
