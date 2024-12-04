import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'bs-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
})
export class BsCloseComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  @Output() click = new EventEmitter<any>();
  onClose(ev: MouseEvent) {
    this.click.emit();
    ev.stopImmediatePropagation();
  }
}
