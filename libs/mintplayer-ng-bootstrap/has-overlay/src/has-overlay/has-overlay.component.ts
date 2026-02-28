import { Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-has-overlay',
  standalone: true,
  templateUrl: './has-overlay.component.html',
  styleUrls: ['./has-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsHasOverlayComponent {}
