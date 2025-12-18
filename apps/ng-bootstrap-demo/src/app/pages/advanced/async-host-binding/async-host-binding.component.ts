import { Component, HostBinding, Input, OnInit, OnDestroy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { interval, Subscription } from 'rxjs';

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

  private subscription?: Subscription;

  ngOnInit() {
    this.subscription = interval(1000).subscribe(value => {
      console.log(value);
      this.padding = value;
      this.isBold = value % 2 === 1;
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
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
