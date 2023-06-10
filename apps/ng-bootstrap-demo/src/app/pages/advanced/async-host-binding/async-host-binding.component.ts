import { Component, HostBinding, HostListener, Input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { interval, map, tap } from 'rxjs';

@Component({
  selector: 'demo-async-host-binding',
  templateUrl: './async-host-binding.component.html',
  styleUrls: ['./async-host-binding.component.scss']
})
export class AsyncHostBindingComponent {
  colors = Color;
}


@Component({
  selector: "demo-hello",
  template: `Hello {{ name }}!`,
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
