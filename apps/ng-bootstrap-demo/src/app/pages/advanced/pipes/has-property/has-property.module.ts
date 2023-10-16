import { Directive, Input, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsHasPropertyModule } from '@mintplayer/ng-bootstrap/has-property';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { HasPropertyRoutingModule } from './has-property-routing.module';
import { Bird, Fish, HasPropertyComponent } from './has-property.component';

@Directive({
  selector: '[hasProperty]',
})
export class HasPropertyDirective<T> {
  @Input() hasProperty: T | undefined;
}

@Directive({
  selector: '[isBird]'
})
export class IsBirdDirective<T> {
  @Input() hasPropertyName!: T;
  @Input() hasPropertyNameProperty!: string;
  
  public static ngTemplateContextGuard<T>(
    dir: IsBirdDirective<T>,
    ctx: any
  ): ctx is IsBirdContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }
}
@Directive({
  selector: '[isFish]'
})
export class IsFishDirective<T> {
  @Input() hasPropertyName!: T;
  // @Input() hasPropertyNameProperty!: string;
  
  public static ngTemplateContextGuard<T>(
    dir: IsFishDirective<T>,
    ctx: any
  ): ctx is IsFishContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }
}

export class IsBirdContext<T = unknown> {
  public $implicit: Bird = null!;
}

export class IsFishContext<T = unknown> {
  public $implicit: Fish = null!;
}

@NgModule({
  declarations: [
    HasPropertyComponent,
    HasPropertyDirective,
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
