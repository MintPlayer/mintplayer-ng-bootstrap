import { Component } from '@angular/core';
import { BsFloatingLabelComponent } from '@mintplayer/ng-bootstrap/floating-labels';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';

@Component({
  selector: 'demo-floating-labels',
  templateUrl: './floating-labels.component.html',
  styleUrls: ['./floating-labels.component.scss'],
  standalone: true,
  imports: [BsFormModule, BsFloatingLabelComponent]
})
export class FloatingLabelsComponent {}
