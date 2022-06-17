import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SwiperComponent } from './swiper.component';

const routes: Routes = [{ path: '', component: SwiperComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SwiperRoutingModule { }
