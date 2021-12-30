import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'bs-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss']
})
export class BsDatepickerComponent implements OnInit {

  constructor() {
    this.selectedDate = new Date();
    this.currentMonth = new Date();
  }

  selectedDate: Date;
  currentMonth: Date;

  ngOnInit(): void {
  }

}
