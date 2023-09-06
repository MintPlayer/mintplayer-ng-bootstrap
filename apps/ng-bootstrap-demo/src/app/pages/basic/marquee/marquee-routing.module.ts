import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MarqueeComponent } from './marquee.component';

const routes: Routes = [{ path: '', component: MarqueeComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MarqueeRoutingModule { }
