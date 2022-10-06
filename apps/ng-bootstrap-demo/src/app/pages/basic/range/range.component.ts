import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'demo-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss']
})
export class RangeComponent implements OnInit {

  constructor() { }

  rangeValue = 2;
  isDisabled = false;
  setDisabled(ev: Event) {
    this.isDisabled = (<any>ev.target).checked;
  }

  ngOnInit(): void {
  }

}
