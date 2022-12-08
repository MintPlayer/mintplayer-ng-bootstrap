import { Component, HostBinding, OnInit } from '@angular/core';

@Component({
  selector: 'bs-breadcrumb-item',
  templateUrl: './breadcrumb-item.component.html',
  styleUrls: ['./breadcrumb-item.component.scss'],
})
export class BsBreadcrumbItemComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  @HostBinding('class.breadcrumb-item') classes = true;
}
