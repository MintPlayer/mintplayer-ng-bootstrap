import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
} from '@angular/core';
import {
  SPARKLINE_SCOPE,
  connectSparkline,
  sparklineScopedStyles,
} from '@mintplayer/ui-core/charts/sparkline';
import { takeHostAria } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';

/**
 * An axis-less inline trend for table cells (#437), rendered by this
 * component's own template from `@mintplayer/ui-core/charts/sparkline`, so the
 * server HTML is the finished chart. `<bs-sparkline>` is the sized box; the
 * `role="img"` svg inside is named by `inputLabel`, the host's `aria-label`,
 * `summaryFormatter`, or the generated "first, last, lowest, highest".
 */
@Component({
  selector: 'bs-sparkline',
  templateUrl: './sparkline.component.html',
  imports: [MpPropsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-mps': SPARKLINE_SCOPE,
    'class': 'sparkline',
  },
})
export class BsSparklineComponent {
  private readonly hostAria = takeHostAria(inject(ElementRef).nativeElement as HTMLElement);
  private readonly localeId = inject(LOCALE_ID);

  readonly points = input<(number | null)[]>([]);
  readonly area = input<boolean>(false);
  readonly showLastDot = input<boolean>(true);
  readonly yMin = input<number | undefined>(undefined);
  readonly yMax = input<number | undefined>(undefined);
  /** Number formatting for the generated name. Defaults to the app's `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);
  readonly inputLabel = input<string | undefined>(undefined);
  readonly summaryFormatter = input<((points: (number | null)[]) => string | undefined) | undefined>(undefined);

  readonly view = computed(() => connectSparkline(this.points(), {
    area: this.area(),
    showLastDot: this.showLastDot(),
    yMin: this.yMin(),
    yMax: this.yMax(),
    locale: this.locale() ?? this.localeId,
    label: this.inputLabel() ?? this.hostAria['aria-label'],
    summaryFormatter: this.summaryFormatter(),
  }));

  constructor() {
    useScopedStyles(SPARKLINE_SCOPE, sparklineScopedStyles);
  }
}
