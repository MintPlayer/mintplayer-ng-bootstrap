import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BsHasNavigationLock } from '../interface/has-navigation-lock';

@Injectable({
  providedIn: 'root'
})
export class BsNavigationLockGuard  {
  canDeactivate(
    component: BsHasNavigationLock,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): Promise<boolean | UrlTree> {
      if (component.navigationLock()) {
        return component.navigationLock().requestCanExit();
      } else {
        console.warn('When using <bs-navigation-lock>, you should implement BsHasNavigationLock and add "readonly navigationLock = viewChild.required<BsNavigationLockDirective>(\'navigationLock\');" to your page');
        return new Promise<boolean>(resolve => resolve(false));
      }
  }
  
}
