import { Component, input, OnInit, OnDestroy, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: "demo-hello",
  template: `Hello {{ name() }}!`,
  standalone: true,
  host: {
    '[class.d-inline-block]': 'true',
    '[class.border]': 'true',
    '[class.mw-100]': 'true',
    '[style.padding.px]': 'padding()',
    '[class.fw-bold]': 'isBold()',
  },
})
export class HelloComponent implements OnInit, OnDestroy {
  name = input.required<string>();

  padding = signal(0);
  isBold = signal(false);

  private intervalId?: ReturnType<typeof setInterval>;
  private counter = 0;

  ngOnInit() {
    this.intervalId = setInterval(() => {
      console.log(this.counter);
      this.padding.set(this.counter);
      this.isBold.set(this.counter % 2 === 1);
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
