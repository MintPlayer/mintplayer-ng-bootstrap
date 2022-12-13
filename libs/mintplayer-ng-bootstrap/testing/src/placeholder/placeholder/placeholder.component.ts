import { Component, Input } from '@angular/core';
import { BsPlaceholderComponent } from '@mintplayer/ng-bootstrap/placeholder';

@Component({
  selector: 'bs-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  providers: [
    { provide: BsPlaceholderComponent, useExisting: BsPlaceholderMockComponent },
  ]
})
export class BsPlaceholderMockComponent {
  @Input() isLoading = false;
}
