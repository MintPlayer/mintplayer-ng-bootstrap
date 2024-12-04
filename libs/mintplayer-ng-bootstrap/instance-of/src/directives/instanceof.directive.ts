import { Directive, Input } from "@angular/core";
import { SwitchView } from "./switch-view";
import { AbstractType } from "../types/abstract.type";

@Directive({
  selector: '[bsInstanceof]',
  standalone: false,
})
export class BsInstanceOfDirective {
  private _defaultViews!: SwitchView[];
  private _defaultUsed = false;
  private _caseCount = 0;
  private _lastCaseCheckIndex = 0;
  private _lastCasesMatched = false;
  private _instanceof: any;

  @Input()
  public set bsInstanceof(newValue: any) {
    this._instanceof = newValue;
    if (this._caseCount === 0) {
      this._updateDefaultCases(true);
    }
  }

  /** @internal */
  public _addCase(): number {
    return this._caseCount++;
  }

  /** @internal */
  public _addDefault(view: SwitchView): void {
    if (!this._defaultViews) {
      this._defaultViews = [];
    }
    this._defaultViews.push(view);
  }

  /** @internal */
  public _matchCase<T>(type: AbstractType<T>): T | undefined {
    const matched =
      this._instanceof instanceof type
        ? this._instanceof
        : undefined;
    this._lastCasesMatched = this._lastCasesMatched || !!matched;
    this._lastCaseCheckIndex++;
    if (this._lastCaseCheckIndex === this._caseCount) {
      this._updateDefaultCases(!this._lastCasesMatched);
      this._lastCaseCheckIndex = 0;
      this._lastCasesMatched = false;
    }
    // debugger;
    return matched;
  }

  private _updateDefaultCases(useDefault: boolean): void {
    if (this._defaultViews && useDefault !== this._defaultUsed) {
      this._defaultUsed = useDefault;
      for (let i = 0; i < this._defaultViews.length; i++) {
        const defaultView = this._defaultViews[i];
        defaultView.enforceState(useDefault);
      }
    }
  }
}
