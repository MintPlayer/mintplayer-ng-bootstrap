import { Component, HostBinding, Input, OnInit, OnDestroy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: "demo-hello",
  template: `Hello {{ name }}!`,
  standalone: true,
})
export class HelloComponent implements OnInit, OnDestroy {
  @Input() name!: string;

  @HostBinding('class.d-inline-block')
  @HostBinding('class.border')
  @HostBinding('class.mw-100')
  classes = true;

  @HostBinding('style.padding.px')
  padding = 0;

  @HostBinding('class.fw-bold')
  isBold = false;

  private intervalId?: ReturnType<typeof setInterval>;
  private counter = 0;

  ngOnInit() {
    this.intervalId = setInterval(() => {
      console.log(this.counter);
      this.padding = this.counter;
      this.isBold = this.counter % 2 === 1;
      this.counter++;
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
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
