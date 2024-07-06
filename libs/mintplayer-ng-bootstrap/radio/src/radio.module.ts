import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BsToggleButtonComponent } from "@mintplayer/ng-bootstrap/toggle-button";
import { BsRadioComponent } from "./component/radio.component";
import { BsRadioGroupDirective } from "./directives/radio-group/radio-group.directive";
import { BsRadioGroupValueAccessorDirective } from "./directives/value-accessor/radio-group.value-accessor.directive";

@NgModule({
    imports: [CommonModule, BsToggleButtonComponent],
    declarations: [
        BsRadioComponent,
        BsRadioGroupDirective,
        BsRadioGroupValueAccessorDirective,
    ],
    exports: [
        BsRadioComponent,
        BsRadioGroupDirective,
        BsRadioGroupValueAccessorDirective,
    ]
})
export class BsRadioModule {}