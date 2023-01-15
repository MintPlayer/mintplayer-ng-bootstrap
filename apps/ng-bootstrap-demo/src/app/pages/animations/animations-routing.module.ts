import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'slide-up-down', loadChildren: () => import('./slide-up-down/slide-up-down.module').then(m => m.SlideUpDownModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnimationsRoutingModule { }
