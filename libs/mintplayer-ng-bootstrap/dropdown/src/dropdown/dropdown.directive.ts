import { ContentChild, Directive, ElementRef, EventEmitter, HostListener, Inject, Input, Optional, Output, signal } from '@angular/core';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
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

  isOpenSignal = signal<boolean>(false);
  @Input() set isOpen(val: boolean) {
    this.isOpenSignal.set(val);
  }
  get isOpen(): boolean {
    return this.isOpenSignal();
  }

  elementRef: ElementRef<HTMLElement>;
  @ContentChild(BsDropdownMenuDirective, {static: false}) menu!: BsDropdownMenuDirective;
  @ContentChild(BsDropdownToggleDirective, {static: false}) toggle: BsDropdownToggleDirective | null = null;

  @Input() public hasBackdrop = false;
  @Input() public sameWidth = false;
  @Input() public closeOnClickOutside = true;
  @Input() public sameDropdownWidth = false;

  //#region IsOpen
  @Output() public isOpenChange = new EventEmitter<boolean>();
  public setIsOpen(value: boolean) {
    if (this.isOpenSignal() !== value) {
      this.isOpenSignal.set(value);
      this.isOpenChange.emit(value);
    }
  }
  //#endregion

  @HostListener('window:blur') onBlur() {
    if (this.closeOnClickOutside && !this.bsDevelopment) {
      this.setIsOpen(false);
    }
  }

}
