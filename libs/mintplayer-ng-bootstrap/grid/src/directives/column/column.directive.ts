import { Directive, HostBinding, Input, signal, computed, effect } from '@angular/core';

@Directive({
  selector: '[xxs],[xs],[sm],[md],[lg],[xl],[xxl]',
  standalone: false,
})
export class BsGridColumnDirective {
  constructor() {
    this.classListComputed = computed(() => {
      const sizes = {
        xxs: this.xxsSignal(),
        xs: this.xsSignal(),
        sm: this.smSignal(),
        md: this.mdSignal(),
        lg: this.lgSignal(),
        xl: this.xlSignal(),
        xxl: this.xxlSignal()
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

    effect(() => {
      this.classList = this.classListComputed();
    });
  }

  @HostBinding('class') classList: string | null = null;

  classListComputed;

  xxsSignal = signal<number | undefined>(undefined);
  @Input() set xxs(val: number | undefined) {
    this.xxsSignal.set(val);
  }

  xsSignal = signal<number | undefined>(undefined);
  @Input() set xs(val: number | undefined) {
    this.xsSignal.set(val);
  }

  smSignal = signal<number | undefined>(undefined);
  @Input() set sm(val: number | undefined) {
    this.smSignal.set(val);
  }

  mdSignal = signal<number | undefined>(undefined);
  @Input() set md(val: number | undefined) {
    this.mdSignal.set(val);
  }

  lgSignal = signal<number | undefined>(undefined);
  @Input() set lg(val: number | undefined) {
    this.lgSignal.set(val);
  }

  xlSignal = signal<number | undefined>(undefined);
  @Input() set xl(val: number | undefined) {
    this.xlSignal.set(val);
  }

  xxlSignal = signal<number | undefined>(undefined);
  @Input() set xxl(val: number | undefined) {
    this.xxlSignal.set(val);
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
