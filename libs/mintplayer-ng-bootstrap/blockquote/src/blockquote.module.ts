import { NgModule } from "@angular/core";
import { BsBlockquoteComponent } from "./blockquote/blockquote.component";
import { BsBlockquoteFooterDirective } from "./blockquote-footer/blockquote-footer.directive";

@NgModule({
    imports: [],
    declarations: [
        BsBlockquoteComponent,
        BsBlockquoteFooterDirective
    ],
    exports: [
        BsBlockquoteComponent,
        BsBlockquoteFooterDirective
    ]
})
export class BsBlockquoteModule {}