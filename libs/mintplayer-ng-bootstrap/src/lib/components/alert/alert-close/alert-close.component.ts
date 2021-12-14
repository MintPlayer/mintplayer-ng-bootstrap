import { Component, OnInit } from '@angular/core';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-alert-close',
  templateUrl: './alert-close.component.html',
  styleUrls: ['./alert-close.component.scss']
})
export class BsAlertCloseComponent implements OnInit {

  constructor(private alert: BsAlertComponent) {
  }

  ngOnInit() {
  }

  closeAlert() {
    this.alert.isVisible = false;
  }
  
}
