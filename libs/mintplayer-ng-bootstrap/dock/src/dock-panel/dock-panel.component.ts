import { DomPortal } from '@angular/cdk/portal';
import { Component, ElementRef, Input, AfterViewInit, ViewChild, Inject, Optional, forwardRef } from '@angular/core';
import { BsTabControlComponent } from '@mintplayer/ng-bootstrap/tab-control';

@Component({
  selector: 'bs-dock-panel',
  templateUrl: './dock-panel.component.html',
  styleUrls: ['./dock-panel.component.scss'],
  standalone: false,
})
export class BsDockPanelComponent implements AfterViewInit {

  @ViewChild('headerElement') headerElement!: ElementRef<HTMLDivElement>;
  @ViewChild('contentElement') contentElement!: ElementRef<HTMLDivElement>;
  headerPortal?: DomPortal;
  contentPortal?: DomPortal;
  @Input() panelId = '';

  ngAfterViewInit() {
    this.headerPortal = new DomPortal(this.headerElement.nativeElement);
    this.contentPortal = new DomPortal(this.contentElement.nativeElement);
  }
}
