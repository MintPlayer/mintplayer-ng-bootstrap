import { AfterViewInit, Component, ChangeDetectionStrategy, ElementRef, inject } from '@angular/core';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';

let instanceCounter = 0;

@Component({
  selector: 'bs-floating-label',
  templateUrl: './floating-label.component.html',
  styleUrls: ['./floating-label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsFloatingLabelComponent implements AfterViewInit {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  constructor() {
    const bsForm = inject(BsFormComponent, { optional: true });
    if (!bsForm) {
      throw '<bs-floating-label> must be inside a <bs-form>';
    }
  }

  /**
   * Associate the projected `<label>` with the projected control.
   *
   * Bootstrap's floating-label pattern *looks* labelled with no association at
   * all — the label floats over the control purely via CSS — so the visual
   * result gives no hint that a screen reader announces an unnamed textbox.
   * `label`/`for` is the native mechanism and everything here is light DOM, so
   * a generated id is all that is missing. Consumer-authored `for`/`id` are
   * left untouched.
   */
  ngAfterViewInit(): void {
    const host = this.hostRef.nativeElement as HTMLElement;
    const control = host.querySelector<HTMLElement>('input, select, textarea');
    const label = host.querySelector<HTMLLabelElement>('label');
    if (!control || !label || label.htmlFor) return;

    if (!control.id) control.id = `bs-floating-label-${++instanceCounter}`;
    label.htmlFor = control.id;
  }
}
