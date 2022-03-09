import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'bs-offcanvas-body',
  templateUrl: './offcanvas-body.component.html',
  styleUrls: ['./offcanvas-body.component.scss']
})
export class OffcanvasBodyComponent implements OnInit {

  constructor() { }

  @Input() noPadding = false;

  ngOnInit(): void {
  }

}
