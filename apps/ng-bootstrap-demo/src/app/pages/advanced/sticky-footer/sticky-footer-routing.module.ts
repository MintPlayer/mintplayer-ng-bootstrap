import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StickyFooterComponent } from './sticky-footer.component';

const routes: Routes = [{ path: '', component: StickyFooterComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StickyFooterRoutingModule { }
