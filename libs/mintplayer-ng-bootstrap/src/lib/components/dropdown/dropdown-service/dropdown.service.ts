import { Injectable, ViewContainerRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BsDropdownService {
  
  ref: ViewContainerRef | null = null;

  public setRootViewContainerRef(ref: ViewContainerRef) {
    this.ref = ref;
  }

}
