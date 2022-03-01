import { Directive, Input, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';
import { BsFromOverlayDirective } from '../from-overlay/from-overlay.directive';

@Directive({
  selector: 'bs-accordion-tab[bsFromOverlayId]'
})
export class BsFromOverlayIdDirective implements OnDestroy {

  constructor(private accordionTab: BsAccordionTabComponent, private bsFromOverlay: BsFromOverlayDirective) {
    this.accordionTab.isActiveChange
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isActive) => {
        if (isActive) {
          bsFromOverlay.bsFromOverlay = this.bsFromOverlayId;
        } else {
          bsFromOverlay.bsFromOverlay = null;
        }
      });
  }

  private destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  //#region bsFromOverlayId
  private _bsFromOverlayId!: string;
  public get bsFromOverlayId() {
    return this._bsFromOverlayId;
  }
  @Input() public set bsFromOverlayId(value: string) {
    this._bsFromOverlayId = value;
    this.accordionTab['tabOverlayIdentifier'] = value;
  }
  //#endregion

}
