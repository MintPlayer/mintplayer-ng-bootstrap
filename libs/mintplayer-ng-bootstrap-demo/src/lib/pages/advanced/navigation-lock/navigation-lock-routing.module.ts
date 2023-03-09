import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BsNavigationLockGuard } from '@mintplayer/ng-bootstrap/navigation-lock';
import { NavigationLockComponent } from './navigation-lock.component';

const routes: Routes = [{ path: '', component: NavigationLockComponent, canDeactivate: [BsNavigationLockGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NavigationLockRoutingModule { }
