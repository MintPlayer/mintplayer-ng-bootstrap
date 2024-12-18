import { ContentChild, Directive, ElementRef, EventEmitter, HostListener, Inject, Input, Optional, Output } from '@angular/core';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';

@Directive({
  selector: '[bsDropdown]',
  standalone: false,
})
export class BsDropdownDirective {

  constructor(elementRef: ElementRef<any>, @Optional() @Inject(BS_DEVELOPMENT) private bsDevelopment?: boolean) {
    this.elementRef = elementRef;
  }

  isOpen$ = new BehaviorSubject<boolean>(false);

  elementRef: ElementRef<HTMLElement>;
  @ContentChild(BsDropdownMenuDirective, {static: false}) menu!: BsDropdownMenuDirective;
  @ContentChild(BsDropdownToggleDirective, {static: false}) toggle: BsDropdownToggleDirective | null = null;
  
  @Input() public hasBackdrop = false;
  @Input() public sameWidth = false;
  @Input() public closeOnClickOutside = true;
  @Input() public sameDropdownWidth = false;

  //#region IsOpen
  public get isOpen() {
    return this.isOpen$.value;
  }
  @Output() public isOpenChange = new EventEmitter<boolean>();
  @Input() public set isOpen(value: boolean) {
    if (this.isOpen$.value !== value) {
      this.isOpen$.next(value);
      this.isOpenChange.emit(value);
    }
  }
  //#endregion

  @HostListener('window:blur') private onBlur() {
    if (this.closeOnClickOutside && !this.bsDevelopment) {
      this.isOpen = false;
    }
  }

}
