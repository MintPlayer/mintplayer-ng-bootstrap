import { Component, Input, OnInit } from '@angular/core';
import { BsNavbarComponent } from '@mintplayer/ng-bootstrap';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'bs-navbar-nav',
  templateUrl: './navbar-nav.component.html',
  styleUrls: ['./navbar-nav.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class BsNavbarNavComponent implements OnInit {

  constructor(bsNavbar: BsNavbarComponent) {
    this.bsNavbar = bsNavbar;
  }

  ngOnInit(): void {
  }

  bsNavbar: BsNavbarComponent;

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
