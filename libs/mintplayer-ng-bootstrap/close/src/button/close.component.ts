import { isPlatformServer } from '@angular/common';
import { Component, EventEmitter, HostBinding, Inject, Output, PLATFORM_ID, TemplateRef } from '@angular/core';

@Component({
  selector: 'bs-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
})
export class BsCloseComponent {
  constructor(@Inject(PLATFORM_ID) platformId: any) {
    this.serverClasses = isPlatformServer(platformId);
  }

  @Output() click = new EventEmitter<any>();
  onClose(ev: MouseEvent) {
    this.click.emit();
    ev.stopImmediatePropagation();
  }

  @HostBinding('class.pe-none')
  serverClasses: boolean;

  customTemplate?: TemplateRef<any>;
}
