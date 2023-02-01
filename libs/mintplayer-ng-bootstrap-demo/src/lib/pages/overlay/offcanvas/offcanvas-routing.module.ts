import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OffcanvasComponent } from './offcanvas.component';

const routes: Routes = [{ path: '', component: OffcanvasComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OffcanvasRoutingModule { }
