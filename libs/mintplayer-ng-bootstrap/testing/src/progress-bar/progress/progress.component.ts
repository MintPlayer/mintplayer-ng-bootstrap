import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
})
export class BsProgressMockComponent {
  @Input() public height = 30;
  @Input() public isIndeterminate = false;
}
