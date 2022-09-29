import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class BsToastComponent {
  @Input() public isVisible = false;
}
