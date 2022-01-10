import { Component, OnInit } from '@angular/core';
import { BsModalPresenterComponent } from '../modal-presenter/modal-presenter.component';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class BsModalComponent implements OnInit {

  constructor(private presenter: BsModalPresenterComponent) {
    console.log('presenter', presenter);
  }

  ngOnInit(): void {
  }

}
