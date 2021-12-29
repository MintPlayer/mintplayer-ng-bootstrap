import { AfterViewInit, ContentChild } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { BsCardHeaderComponent } from '../card-header/card-header.component';

@Component({
  selector: 'bs-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class BsCardComponent implements OnInit, AfterViewInit {

  constructor() {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

  // @ContentChild(CardHeaderComponent) header!: CardHeaderComponent;
}
