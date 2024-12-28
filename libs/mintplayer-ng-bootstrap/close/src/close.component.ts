import { Component, EventEmitter, OnInit, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'bs-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
})
export class BsCloseComponent {
  @Output() click = new EventEmitter<any>();
  onClose(ev: MouseEvent) {
    this.click.emit();
    ev.stopImmediatePropagation();
  }
}
