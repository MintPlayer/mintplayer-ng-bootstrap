import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsOrdinalNumberPipe } from '@mintplayer/ng-bootstrap/ordinal-number';

@Component({
  selector: 'demo-ordinal-number',
  templateUrl: './ordinal-number.component.html',
  styleUrls: ['./ordinal-number.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsOrdinalNumberPipe]
})
export class OrdinalNumberComponent {
  text = 'This is the 1st demo of how you can use the BsOrdinalNumberPipe. The 2nd and 3rd demo also work as expected.';
}
