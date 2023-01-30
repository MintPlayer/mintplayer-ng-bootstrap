import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BetterCarouselComponent } from './better-carousel.component';

const routes: Routes = [{ path: '', component: BetterCarouselComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BetterCarouselRoutingModule { }
