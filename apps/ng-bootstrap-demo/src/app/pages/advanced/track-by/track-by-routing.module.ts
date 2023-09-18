import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrackByComponent } from './track-by.component';

const routes: Routes = [{ path: '', component: TrackByComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TrackByRoutingModule { }
