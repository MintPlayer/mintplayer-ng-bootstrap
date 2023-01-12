import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { BsHasNavigationLock } from '../interface/has-navigation-lock';

@Injectable({
  providedIn: 'root'
})
export class BsNavigationLockGuard implements CanDeactivate<BsHasNavigationLock> {
  canDeactivate(
    component: BsHasNavigationLock,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): Promise<boolean | UrlTree> {
      // console.log('run candeactivate');
      return component.navigationLock.requestCanExit();
      // return canExit;
  }
  
}
