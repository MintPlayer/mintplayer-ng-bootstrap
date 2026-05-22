import { AfterContentChecked, Component, ElementRef, inject, input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-navbar-brand',
  templateUrl: './navbar-brand.component.html',
  styleUrls: ['./navbar-brand.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.mx-auto]': 'true',
  },
})
export class BsNavbarBrandComponent implements AfterContentChecked {
  private element = inject(ElementRef);
  readonly routerLink = input<any[]>([]);

  ngAfterContentChecked() {
    const anchor = this.element.nativeElement.querySelector('a');
    if (anchor) {
      anchor.classList.add('nav-link');
    }
  }
}
