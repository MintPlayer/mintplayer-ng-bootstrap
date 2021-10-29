import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'bs-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: ['./navbar-item.component.scss']
})
export class BsNavbarItemComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  @Input() routerLink: any[] | null = null;

}
