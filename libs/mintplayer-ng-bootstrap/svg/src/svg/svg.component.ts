import { AfterViewInit, Compiler, Component, ComponentFactoryResolver, Injector, Input, NgModule, NgModuleRef, ViewChild, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, filter } from 'rxjs';

@Component({
  selector: 'bs-svg',
  templateUrl: './svg.component.html',
  styleUrls: ['./svg.component.scss'],
})
export class BsSvgComponent implements AfterViewInit {

  constructor(private compiler: Compiler, private injector: Injector, private mod: NgModuleRef<any>) {
    combineLatest([this.icon$, this.viewInited$])
      .pipe(filter(([icon, viewInited]) => viewInited))
      .pipe(takeUntilDestroyed()).subscribe(([icon]) => {
        // icon = templateUrl
        const tmpComp = Component({
          moduleId: module.id,
          templateUrl: icon ?? undefined
        })(class {});

        const tmpModule = NgModule({
          declarations: [tmpComp]
        })(class {});

        this.compiler
          .compileModuleAndAllComponentsAsync(tmpModule)
          .then((factories) => {
            const cmpRef = factories.componentFactories[0]
              .create(injector, [], null, this.mod);
            this.placeholder?.insert(cmpRef.hostView);
          });

          this.placeholder.createComponent()
      });
  }

  ngAfterViewInit() {
    this.viewInited$.next(true);
  }

  @ViewChild('placeholder', { read: ViewContainerRef }) placeholder!: ViewContainerRef;

  viewInited$ = new BehaviorSubject<boolean>(false);
  icon$ = new BehaviorSubject<string | null>(null);
  @Input() set icon(value: string) {
    this.icon$.next(value);
  }
}
