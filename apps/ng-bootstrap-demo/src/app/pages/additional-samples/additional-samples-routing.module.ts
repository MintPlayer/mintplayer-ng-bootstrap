import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full', canActivate: [() => false] },
  { path: 'collapse', loadChildren: () => import('./collapse/collapse.module').then(m => m.CollapseModule) },
  { path: 'focus-trap', loadChildren: () => import('./focus-trap/focus-trap.module').then(m => m.FocusTrapModule) },
  { path: 'drag-drop', loadChildren: () => import('./drag-drop/drag-drop.module').then(m => m.DragDropModule) },
  { path: 'qr-code', loadChildren: () => import('./qr-code/qr-code.module').then(m => m.QrCodeModule) },
  { path: 'swiper', loadChildren: () => import('./swiper/swiper.module').then(m => m.SwiperModule) },
  { path: 'parentify', loadChildren: () => import('./parentify/parentify.module').then(m => m.ParentifyModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdditionalSamplesRoutingModule { }
