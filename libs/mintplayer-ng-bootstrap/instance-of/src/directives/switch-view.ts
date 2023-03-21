import { ViewContainerRef, TemplateRef } from "@angular/core";
import { BsInstanceOfContext } from "../interfaces/instance-of-context";

export class SwitchView<T = unknown> {
    private _created = false;
    private _context = new BsInstanceOfContext<T>();
  
    public constructor(private _viewContainerRef: ViewContainerRef, private _templateRef: TemplateRef<BsInstanceOfContext<T>>) {}
  
    public enforceState(result?: T) {
        if (result && !this._created) {
            this.create(result);
        } else if (!result && this._created) {
            this.destroy();
        } else if (result) {
            this._context.$implicit = this._context.bsInstanceofCase = result;
        }
    }
  
    private create(result: T) {
        this._created = true;
        this._context.$implicit = this._context.bsInstanceofCase = result;
        this._viewContainerRef.createEmbeddedView(this._templateRef, this._context);
    }
  
    private destroy() {
        this._created = false;
        this._viewContainerRef.clear();
    }
}