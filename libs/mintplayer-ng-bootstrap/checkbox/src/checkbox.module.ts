import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BsToggleButtonComponent } from "@mintplayer/ng-bootstrap/toggle-button";
import { BsCheckboxComponent } from "./component/checkbox.component";
import { BsCheckboxGroupDirective } from "./directives/checkbox-group/checkbox-group.directive";
import { BsCheckboxGroupValueAccessorDirective } from "./directives/value-accessor/checkbox-group.value-accessor.directive";

@NgModule({
    imports: [CommonModule, BsToggleButtonComponent],
    declarations: [
        BsCheckboxComponent,
        BsCheckboxGroupDirective,
        BsCheckboxGroupValueAccessorDirective,
    ],
    exports: [
        BsCheckboxComponent,
        BsCheckboxGroupDirective,
        BsCheckboxGroupValueAccessorDirective,
    ]
})
export class BsCheckboxModule {}