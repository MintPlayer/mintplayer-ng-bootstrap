import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'bs-datatable-column',
  templateUrl: './datatable-column.component.html',
  styleUrls: ['./datatable-column.component.scss']
})
export class BsDatatableColumnComponent implements OnInit {

  constructor() {
  }

  @Input() name: string = 'column';
  @Input() title: string = '';
  @Input() sortable: boolean = true;

  ngOnInit(): void {
  }

}
