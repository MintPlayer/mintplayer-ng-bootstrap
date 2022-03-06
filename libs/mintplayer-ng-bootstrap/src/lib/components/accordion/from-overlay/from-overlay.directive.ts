import { AfterContentInit, AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, Input, OnDestroy, Output, QueryList } from '@angular/core';
import { BehaviorSubject, combineLatest, debounce, debounceTime, filter, Subject, takeUntil } from 'rxjs';
import { BsAccordionTabComponent } from '..';
import { BsAccordionComponent } from '../accordion/accordion.component';
import { BsFromOverlayIdDirective } from '../from-overlay-id/from-overlay-id.directive';

@Directive({
  selector: 'bs-accordion[bsFromOverlay]'
})
export class BsFromOverlayDirective implements AfterContentInit, OnDestroy {

  constructor(private accordion: BsAccordionComponent) {
    this.accordion.disableAnimations = true;
    combineLatest([this.inited$, this.activeOverlayIdentifier$])
      .pipe(filter(([inited, activeOverlayIdentifier]) => {
        return inited;
      }))
      // .pipe(debounceTime(5))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([inited, activeOverlayIdentifier]) => {
        this.bsFromOverlayChange.emit(activeOverlayIdentifier);
        this.accordion.tabPages.forEach((tab) => {
          tab.isActive = (tab["tabOverlayIdentifier"] == activeOverlayIdentifier);
        });
        setTimeout(() => this.accordion.disableAnimations = false, 30);
      });
  }

  private readonly inited$ = new BehaviorSubject<boolean>(false);
  private readonly destroyed$ = new Subject();
  private readonly activeOverlayIdentifier$ = new BehaviorSubject<string | null>(null);

  @Output() public bsFromOverlayChange = new EventEmitter<string | null>();
  private _bsFromOverlay: string | null = null;

  /** Binds the active tab of an accordion to a field, in case the accordion is rendered in an overlay. */
  public get bsFromOverlay() {
    return this._bsFromOverlay;
  }
  @Input() public set bsFromOverlay(value: string | null) {
    if (this._bsFromOverlay != value) {
      this._bsFromOverlay = value;
      this.activeOverlayIdentifier$.next(value);
    }
  }

  @ContentChildren(BsFromOverlayIdDirective, { read: ElementRef }) tabPages!: QueryList<ElementRef<BsAccordionTabComponent>>;
  
  ngAfterContentInit() {
    this.inited$.next(true);
  }
  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
