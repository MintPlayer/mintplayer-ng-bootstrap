import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class BsNavbarComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(private element: ElementRef) {
    this.resizeObserver = new ResizeObserver((entries) => {
      let height = entries[0].contentRect.height;
      this.heightChange.emit(height);
    });
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.resizeObserver.observe(this.nav.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver.unobserve(this.nav.nativeElement);
  }

  isExpanded = false;
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }

  @ViewChild('nav') nav!: ElementRef;
  resizeObserver: ResizeObserver;
  @Output() public heightChange: EventEmitter<number> = new EventEmitter();
}
