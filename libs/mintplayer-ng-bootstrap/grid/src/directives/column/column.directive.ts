import { Directive, HostBinding, Input, computed, input } from '@angular/core';

@Directive({
  selector: '[xxs],[xs],[sm],[md],[lg],[xl],[xxl]',
  standalone: false,
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
      .join(' ');
  });

  @HostBinding('class') get classBinding() {
    return this.classList() || null;
  }
}

@Directive({
  selector: '[col]',
  standalone: false,
})
export class BsGridColDirective {
  @HostBinding('class.col') colClass = true;
  @Input() set col(value: undefined) {}
}