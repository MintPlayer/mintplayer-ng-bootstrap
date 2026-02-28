import { AfterViewInit, Component, inject, input, ChangeDetectionStrategy} from '@angular/core';
import { BsDropdownDirective } from '@mintplayer/ng-bootstrap/dropdown';
// import { BsDropdownComponent } from '@mintplayer/ng-bootstrap/dropdown';

@Component({
  selector: 'bs-dropdown-menu',
  templateUrl: './dropdown-menu.component.html',
  styleUrls: ['./dropdown-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width]': 'dropdownWith',
    '(window:resize)': 'onResize()',
  },
})
export class BsDropdownMenuComponent implements AfterViewInit {
  private bsDropdown = inject(BsDropdownDirective, { optional: true });

  readonly maxHeight = input<number | null>(null);
  dropdownWith: string | null = null;

  onResize() {
    if ((typeof window !== 'undefined') && this.bsDropdown && this.bsDropdown.sameDropdownWidth()) {
      const element = this.bsDropdown.elementRef.nativeElement;
      this.dropdownWith = window.getComputedStyle(element).width;
    }
  }

  ngAfterViewInit() {
    this.onResize();
  }
}
