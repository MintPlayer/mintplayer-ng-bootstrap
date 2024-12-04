import { Component, HostBinding, HostListener, Input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { interval, map, tap } from 'rxjs';

@Component({
  selector: "demo-hello",
  template: `Hello {{ name }}!`,
  standalone: true,
})
export class HelloComponent {
  @Input() name!: string;

  @HostBinding('class.d-inline-block')
  @HostBinding('class.border')
  @HostBinding('class.mw-100')
  classes = true;

  @HostBinding("$.style.padding.px")
  @HostListener("$.style.padding.px")
  readonly test = interval(1000).pipe(tap(console.log));

  @HostBinding("$.class.fw-bold")
  @HostListener("$.class.fw-bold")
  readonly active = this.test.pipe(map(v => v % 2));
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
