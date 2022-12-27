import { AfterViewInit, Component, HostBinding, HostListener, Input, Optional } from '@angular/core';
import { BsDropdownDirective } from '@mintplayer/ng-bootstrap/dropdown';
// import { BsDropdownComponent } from '@mintplayer/ng-bootstrap/dropdown';

@Component({
  selector: 'bs-dropdown-menu',
  templateUrl: './dropdown-menu.component.html',
  styleUrls: ['./dropdown-menu.component.scss'],
})
export class BsDropdownMenuComponent implements AfterViewInit {
  constructor(@Optional() private bsDropdown?: BsDropdownDirective) {
  }

  @HostBinding('class.position-relative') positionRelative = false;
  @Input() maxHeight: number | null = null;
  @HostBinding('style.width') dropdownWith: string | null = null;

  @HostListener('window:resize')
  onResize() {
    if ((typeof window !== 'undefined') && this.bsDropdown && this.bsDropdown.sameDropdownWidth) {
      const element = this.bsDropdown.elementRef.nativeElement;
      this.dropdownWith = window.getComputedStyle(element).width;
    }
  }

  ngAfterViewInit() {
    this.onResize();
  }
}
