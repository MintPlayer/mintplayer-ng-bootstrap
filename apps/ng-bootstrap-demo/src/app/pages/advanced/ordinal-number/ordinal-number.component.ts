import { Component } from '@angular/core';

@Component({
  selector: 'demo-ordinal-number',
  templateUrl: './ordinal-number.component.html',
  styleUrls: ['./ordinal-number.component.scss']
})
export class OrdinalNumberComponent {
  text = 'This is the 1st demo of how you can use the BsOrdinalNumberPipe. The 2nd and 3rd demo also work as expected.';
}
