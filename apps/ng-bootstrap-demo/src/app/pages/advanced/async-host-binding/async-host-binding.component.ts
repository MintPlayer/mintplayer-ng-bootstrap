import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { dedent } from 'ts-dedent';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

@Component({
  selector: "demo-hello",
  template: `Hello {{ name() }}!`,
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
      this.padding.set(counter);
      this.isBold.set(counter % 2 === 1);
      counter++;
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }
}

@Component({
  selector: 'demo-rxjs-host',
  template: `Driven by an RxJS Observable (tick {{ tick() }})`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.d-inline-block]': 'true',
    '[class.border]': 'true',
    '[style.padding.px]': 'tick()',
    '[class.text-bg-primary]': '(tick() % 2) === 0',
  },
})
export class RxjsHostComponent {
  // Wrap any Observable with toSignal() so it can drive a host binding
  // (or template binding) in zoneless mode.
  readonly tick = toSignal(interval(750).pipe(map(i => i % 16)), { initialValue: 0 });
}

@Component({
  selector: 'demo-async-host-binding',
  templateUrl: './async-host-binding.component.html',
  styleUrls: ['./async-host-binding.component.scss'],
  imports: [
    BsAlertComponent,
    BsCodeSnippetComponent,
    HelloComponent,
    RxjsHostComponent
  ]
})
export class AsyncHostBindingComponent {
  colors = Color;

  signalHostExample = dedent`
    @Component({
      selector: 'my-thing',
      template: \`...\`,
      host: {
        '[style.padding.px]': 'padding()',
        '[class.fw-bold]':    'isBold()',
      },
    })
    export class MyThing {
      padding = signal(0);
      isBold  = signal(false);
    }`;

  toSignalExample = dedent`
    import { toSignal } from '@angular/core/rxjs-interop';

    @Component({
      host: { '[style.padding.px]': 'tick()' },
    })
    export class MyThing {
      readonly tick = toSignal(this.someService.tick$, { initialValue: 0 });
    }`;
}
