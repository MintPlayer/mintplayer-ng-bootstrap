import { Component, DestroyRef, inject, input, signal, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: "demo-hello",
  template: `Hello {{ name() }}!`,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.d-inline-block]': 'true',
    '[class.border]': 'true',
    '[class.mw-100]': 'true',
    '[style.padding.px]': 'padding()',
    '[class.fw-bold]': 'isBold()',
  },
})
export class HelloComponent {
  readonly name = input.required<string>();

  padding = signal(0);

  isBold = signal(false);

  private destroyRef = inject(DestroyRef);

  constructor() {
    let counter = 0;
    const id = setInterval(() => {
      console.log(counter);
      this.padding.set(counter);
      this.isBold.set(counter % 2 === 1);
      counter++;
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }
}

@Component({
  selector: 'demo-async-host-binding',
  templateUrl: './async-host-binding.component.html',
  styleUrls: ['./async-host-binding.component.scss'],
  standalone: true,
  imports: [
    BsAlertComponent,
    HelloComponent
  ]
})
export class AsyncHostBindingComponent {
  colors = Color;
}
