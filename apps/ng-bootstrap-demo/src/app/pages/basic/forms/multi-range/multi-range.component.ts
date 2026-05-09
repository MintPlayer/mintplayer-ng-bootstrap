import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-multi-range',
  templateUrl: './multi-range.component.html',
  styleUrls: ['./multi-range.component.scss'],
  imports: [
    JsonPipe,
    FormsModule,
    ReactiveFormsModule,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsGridColDirective,
    BsMultiRangeComponent,
    BsToggleButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiRangeComponent {
  readonly basicValue = model<number[]>([20, 80]);
  readonly threeThumbValue = model<number[]>([2, 5, 8]);
  readonly minDistanceValue = model<number[]>([20, 60]);
  readonly currencyValue = model<number[]>([25, 75]);
  readonly verticalValue = model<number[]>([30, 70]);
  readonly rtlValue = model<number[]>([15, 85]);
  readonly disabledValue = model<number[]>([25, 75]);
  readonly isDisabled = model(false);

  readonly currencyFormatter = (v: number) => `$${v.toFixed(2)}`;

  readonly reactiveControl = new FormControl<number[]>([10, 40, 70], { nonNullable: true });
  private readonly reactiveValue = toSignal(this.reactiveControl.valueChanges, {
    initialValue: this.reactiveControl.value,
  });
  readonly reactiveJson = computed(() => JSON.stringify(this.reactiveValue()));
}
