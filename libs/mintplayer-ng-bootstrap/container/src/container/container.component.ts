import { Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsContainerComponent {}
