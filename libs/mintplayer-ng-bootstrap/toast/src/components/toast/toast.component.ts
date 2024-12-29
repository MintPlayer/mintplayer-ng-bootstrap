import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'bs-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None,
})
export class BsToastComponent {
  @Input() public isVisible = false;
}
