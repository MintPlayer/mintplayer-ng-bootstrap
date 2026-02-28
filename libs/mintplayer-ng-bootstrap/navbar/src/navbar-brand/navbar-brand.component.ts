import { Component, input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-navbar-brand',
  templateUrl: './navbar-brand.component.html',
  styleUrls: ['./navbar-brand.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.mx-auto]': 'true',
  },
})
export class BsNavbarBrandComponent {
  readonly routerLink = input<any[]>([]);
}
