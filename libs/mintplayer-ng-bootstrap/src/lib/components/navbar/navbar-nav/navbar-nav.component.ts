import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'bs-navbar-nav',
  templateUrl: './navbar-nav.component.html',
  styleUrls: ['./navbar-nav.component.scss']
})
export class BsNavbarNavComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  //#region collapse
  private _collapse: boolean = true;
  @Input() public set collapse(value: boolean) {
    this._collapse = value;
  }
  public get collapse() {
    return this._collapse;
  }
  //#endregion
}
