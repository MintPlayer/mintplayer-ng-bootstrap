import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { dedent } from 'ts-dedent';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
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
    BsCheckboxComponent,
    BsCodeSnippetComponent,
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

  // ---- Code snippets shown alongside each example ----------------------------

  readonly basicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
    @Component({
      selector: 'app-basic-multi-range',
      imports: [FormsModule, BsMultiRangeComponent],
      templateUrl: './basic-multi-range.component.html',
    })
    export class BasicMultiRangeComponent {
      readonly value = signal<number[]>([20, 80]);
      readonly disabled = signal(false);
    }`;
  readonly basicHtml = dedent`
    <bs-multi-range
      [min]="0"
      [max]="100"
      [(ngModel)]="value"
      [disabled]="disabled()">
    </bs-multi-range>`;

  readonly threeThumbTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
    @Component({
      selector: 'app-three-thumb',
      imports: [FormsModule, BsMultiRangeComponent],
      templateUrl: './three-thumb.component.html',
    })
    export class ThreeThumbComponent {
      readonly value = signal<number[]>([2, 5, 8]);
    }`;
  readonly threeThumbHtml = dedent`
    <bs-multi-range
      [min]="0"
      [max]="10"
      [step]="0.5"
      [(ngModel)]="value">
    </bs-multi-range>`;

  readonly minDistanceTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
    @Component({
      selector: 'app-min-distance',
      imports: [FormsModule, BsMultiRangeComponent],
      templateUrl: './min-distance.component.html',
    })
    export class MinDistanceComponent {
      readonly value = signal<number[]>([20, 60]);
    }`;
  readonly minDistanceHtml = dedent`
    <bs-multi-range
      [min]="0"
      [max]="100"
      [minDistance]="20"
      [(ngModel)]="value">
    </bs-multi-range>`;

  readonly currencyTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
    @Component({
      selector: 'app-currency-range',
      imports: [FormsModule, BsMultiRangeComponent],
      templateUrl: './currency-range.component.html',
    })
    export class CurrencyRangeComponent {
      readonly value = signal<number[]>([25, 75]);
      readonly format = (v: number) => '$' + v.toFixed(2);
    }`;
  readonly currencyHtml = dedent`
    <bs-multi-range
      [min]="0"
      [max]="100"
      [(ngModel)]="value"
      [formatValue]="format">
    </bs-multi-range>`;

  readonly verticalTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
    @Component({
      selector: 'app-vertical-range',
      imports: [FormsModule, BsMultiRangeComponent],
      templateUrl: './vertical-range.component.html',
      styles: [':host .vertical-host { display: block; height: 12rem; }'],
    })
    export class VerticalRangeComponent {
      readonly value = signal<number[]>([30, 70]);
    }`;
  readonly verticalHtml = dedent`
    <div class="vertical-host">
      <bs-multi-range
        [min]="0"
        [max]="100"
        [(ngModel)]="value"
        [orientation]="'vertical'">
      </bs-multi-range>
    </div>`;

  readonly rtlTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
    @Component({
      selector: 'app-rtl-range',
      imports: [FormsModule, BsMultiRangeComponent],
      templateUrl: './rtl-range.component.html',
    })
    export class RtlRangeComponent {
      readonly value = signal<number[]>([15, 85]);
    }`;
  readonly rtlHtml = dedent`
    <div dir="rtl">
      <bs-multi-range
        [min]="0"
        [max]="100"
        [(ngModel)]="value">
      </bs-multi-range>
    </div>`;

  readonly disabledTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
    @Component({
      selector: 'app-disabled-range',
      imports: [FormsModule, BsMultiRangeComponent],
      templateUrl: './disabled-range.component.html',
    })
    export class DisabledRangeComponent {
      readonly value = signal<number[]>([25, 75]);
    }`;
  readonly disabledHtml = dedent`
    <bs-multi-range
      [min]="0"
      [max]="100"
      [(ngModel)]="value"
      [disabled]="true">
    </bs-multi-range>`;

  readonly reactiveTs = dedent`
    import { Component } from '@angular/core';
    import { FormControl, ReactiveFormsModule } from '@angular/forms';
    import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
    @Component({
      selector: 'app-reactive-range',
      imports: [ReactiveFormsModule, BsMultiRangeComponent],
      templateUrl: './reactive-range.component.html',
    })
    export class ReactiveRangeComponent {
      readonly control = new FormControl<number[]>([10, 40, 70], { nonNullable: true });
    }`;
  readonly reactiveHtml = dedent`
    <bs-multi-range
      [min]="0"
      [max]="100"
      [formControl]="control">
    </bs-multi-range>
    <pre>{{ control.value | json }}</pre>`;
}
