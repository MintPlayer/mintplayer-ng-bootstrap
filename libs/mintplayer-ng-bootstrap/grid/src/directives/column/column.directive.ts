import { Directive, computed, input } from '@angular/core';

@Directive({
  selector: '[xxs],[xs],[sm],[md],[lg],[xl],[xxl]',
  host: {
    '[class]': 'classList()',
  },
})
export class BsGridColumnDirective {

  xxs = input<number | undefined>(undefined);
  xs = input<number | undefined>(undefined);
  sm = input<number | undefined>(undefined);
  md = input<number | undefined>(undefined);
  lg = input<number | undefined>(undefined);
  xl = input<number | undefined>(undefined);
  xxl = input<number | undefined>(undefined);

  classList = computed(() => {
    const sizes = {
      xxs: this.xxs(),
      xs: this.xs(),
      sm: this.sm(),
      md: this.md(),
      lg: this.lg(),
      xl: this.xl(),
      xxl: this.xxl(),
    };
    return Object.keys(sizes)
      .map(key => ({
        key,
        value: (<any>sizes)[key],
      }))
      .filter(v => v.value)
      .map(v => {
        switch (v.key) {
          case '': return 'col';
          case 'xxs': return `col-${v.value}`;
          default: return `col-${v.key}-${v.value}`;
        }
      })
      .join(' ') || null;
  });
}

@Directive({
  selector: '[col]',
  host: {
    '[class.col]': 'true',
  },
})
export class BsGridColDirective {
  readonly col = input<undefined>(undefined);
}
