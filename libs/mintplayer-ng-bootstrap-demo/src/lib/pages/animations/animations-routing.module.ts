import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full', canActivate: [() => false] },
  { path: 'slide-up-down', loadChildren: () => import('./slide-up-down/slide-up-down.module').then(m => m.SlideUpDownModule) },
  { path: 'fade-in-out', loadChildren: () => import('./fade-in-out/fade-in-out.module').then(m => m.FadeInOutModule) },
  { path: 'color-transition', loadChildren: () => import('./color-transition/color-transition.module').then(m => m.ColorTransitionModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnimationsRoutingModule { }
