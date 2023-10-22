import { Directive, Input, NgModule, ViewContainerRef, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsHasPropertyModule } from '@mintplayer/ng-bootstrap/has-property';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { HasPropertyRoutingModule } from './has-property-routing.module';
import { Animal, Bird, Fish, HasPropertyComponent } from './has-property.component';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// @Directive({
//   selector: '[hasProperty]',
// })
// export class HasPropertyDirective<T> {
//   @Input() hasProperty: T | undefined;
// }

@Directive({
  selector: '[isBird]'
})
export class IsBirdDirective<T> {
  constructor(private viewContainer: ViewContainerRef, private template: TemplateRef<IsBirdContext>) {
    combineLatest([this.value$, this.property$])
      .pipe(takeUntilDestroyed())
      .subscribe(([value, property]) => {
        if (!property || !value) {
          this.viewContainer.clear();
        } else if (property in value) {
          this.viewContainer.createEmbeddedView(this.template, {
            $implicit: <Bird>value
          });
        } else {
          this.viewContainer.clear();
        }
      })
  }

  value$ = new BehaviorSubject<Animal | null | undefined>(undefined);
  property$ = new BehaviorSubject<KeysOfUnion<Animal> | undefined>(undefined);

  @Input() set isBird(value: Animal | undefined) {
    this.value$.next(value);
  }
  @Input() set isBirdProperty(value: KeysOfUnion<Animal>) {
    this.property$.next(value);
  }
  
  public static ngTemplateContextGuard<T>(
    dir: IsBirdDirective<T>,
    ctx: any
  ): ctx is IsBirdContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }
}

type KeysOfUnion<T> = (T extends T ? keyof T: never);// | undefined;

@Directive({
  selector: '[isFish]'
})
export class IsFishDirective<T> {
  constructor(private viewContainer: ViewContainerRef, private template: TemplateRef<IsFishContext>) {
    combineLatest([this.value$, this.property$])
      .pipe(takeUntilDestroyed())
      .subscribe(([value, property]) => {
        if (!property || !value) {
          this.viewContainer.clear();
        } else if (property in value) {
          this.viewContainer.createEmbeddedView(this.template, {
            $implicit: <Fish>value
          });
        } else {
          this.viewContainer.clear();
        }
      })
  }

  value$ = new BehaviorSubject<Animal | null | undefined>(undefined);
  property$ = new BehaviorSubject<string | undefined>(undefined);

  @Input() set isFish(value: Animal | undefined) {
    this.value$.next(value);
  }
  @Input() set isFishProperty(value: KeysOfUnion<Animal>) {
    this.property$.next(value);
  }

  public static ngTemplateContextGuard<T>(
    dir: IsFishDirective<T>,
    ctx: any
  ): ctx is IsFishContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }
}

// export class AnimalContext<T = unknown> {
//   public $implicit: Bird | Fish = null!;
// }

export class IsBirdContext<T = unknown> {
  public $implicit: Bird = null!;
}

export class IsFishContext<T = unknown> {
  public $implicit: Fish = null!;
}

@NgModule({
  declarations: [
    HasPropertyComponent,
    // HasPropertyDirective,
    IsBirdDirective,
    IsFishDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsHasPropertyModule,
    BsCodeSnippetModule,
    BsToggleButtonModule,
    HasPropertyRoutingModule
  ]
})
export class HasPropertyModule { }
