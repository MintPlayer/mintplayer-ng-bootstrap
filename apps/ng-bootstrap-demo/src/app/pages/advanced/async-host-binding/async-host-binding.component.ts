import { Component, HostBinding, HostListener, Input, signal, effect, OnDestroy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: "demo-hello",
  template: `Hello {{ name }}!`,
  standalone: true,
})
export class HelloComponent implements OnDestroy {
  @Input() name!: string;

  @HostBinding('class.d-inline-block')
  @HostBinding('class.border')
  @HostBinding('class.mw-100')
  classes = true;

  testSignal = signal<number>(0);
  activeSignal = signal<number>(0);
  private intervalId: any;

  constructor() {
    this.intervalId = setInterval(() => {
      const value = this.testSignal() + 1;
      console.log(value);
      this.testSignal.set(value);
      this.activeSignal.set(value % 2);
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  @HostBinding("$.style.padding.px")
  @HostListener("$.style.padding.px")
  get test() { return this.testSignal; }

  @HostBinding("$.class.fw-bold")
  @HostListener("$.class.fw-bold")
  get active() { return this.activeSignal; }
}

@Component({
  selector: 'demo-async-host-binding',
  templateUrl: './async-host-binding.component.html',
  styleUrls: ['./async-host-binding.component.scss'],
  standalone: true,
  imports: [
    BsAlertModule,
    HelloComponent
  ]
})
export class AsyncHostBindingComponent {
  colors = Color;
}
