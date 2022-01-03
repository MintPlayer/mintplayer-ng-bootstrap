import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { BehaviorSubject, map, Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'bs-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss']
})
export class BsTypeaheadComponent implements AfterViewInit {
  
  dropdownVisible$ = new BehaviorSubject<boolean>(false);
  suggestions$ = new BehaviorSubject<any[]>([]);
  isLoading$ = new BehaviorSubject<boolean>(false);
  showNoSuggestions$: Observable<boolean>;
  hostWidth$ = new BehaviorSubject<number>(200);
  destroyed$ = new Subject();
  
  @ViewChild('textbox') textbox!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
  @Input() searchterm = '';
  @Input() public isLoadingText = 'Loading...';
  @Input() public noSuggestionsText = 'No suggestions found';
  @Output() public provideSuggestions = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<any>();
  @Output() searchtermChange = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<string>();
  
  private wait = false;
  private overlayRef: OverlayRef | null = null;
  private templatePortal: TemplatePortal<any> | null = null;

  constructor(
    private overlay: Overlay,
    private elementRef: ElementRef,
    private viewContainerRef: ViewContainerRef
  ) {
    this.showNoSuggestions$ = this.suggestions$
      .pipe(map(suggestions => suggestions.length === 0));

    this.dropdownVisible$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isVisible) => {
        if (isVisible) {
          this.wait = true;
          setTimeout(() => this.wait = false, 100);

          this.overlayRef = this.overlay.create({
            hasBackdrop: false,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            positionStrategy: this.overlay.position()
              .flexibleConnectedTo(this.elementRef)
              .withPositions([
                { originX: "start", originY: "bottom", overlayX: "start", overlayY: "top", offsetY: 0 },
                { originX: "start", originY: "top", overlayX: "start", overlayY: "bottom", offsetY: 0 },
              ]),
          });
      
          this.templatePortal = new TemplatePortal(this.dropdownTemplate, this.viewContainerRef);
          this.overlayRef.attach(this.templatePortal);
        } else {
          if (this.overlayRef) {
            this.overlayRef.detach();
            this.overlayRef.dispose();
            this.overlayRef = null;
          }
        }
      });
  }

  ngAfterViewInit() {
    this.onResize();
  }

  //#region DropdownVisible
  clickedOutside() {
    this.dropdownVisible$.next(false);
  }
  //#endregion

  onProvideSuggestions(value: string) {
    this.searchterm = value;
    this.searchtermChange.emit(this.searchterm);

    if (this.searchterm === '') {
      this.dropdownVisible$.next(false);
      this.suggestions$.next([]);
    } else {
      this.isLoading$.next(true);
      this.dropdownVisible$.next(true);
      this.provideSuggestions.emit(value);
    }
  }

  @Input() public set suggestions(value: any[]) {
    this.isLoading$.next(false);
    this.suggestions$.next(value);
  }
  suggestionClicked(suggestion: any) {
    this.searchterm = suggestion.text;
    this.searchtermChange.emit(this.searchterm);

    this.dropdownVisible$.next(false);
    this.suggestionSelected.emit(suggestion);
  }

  onSubmit() {
    this.dropdownVisible$.next(false);
    this.submitted.emit(this.searchterm);
  }

  public focus() {
    this.textbox.nativeElement.focus();
  }

  @HostListener('window:resize')
  onResize() {
    this.hostWidth$.next(this.textbox.nativeElement.offsetWidth);
  }
  
  // @HostListener('clickOutside', ['$event']) clickedOutside(ev: MouseEvent) {
  //   if (!this.wait) {
  //     if (!this.overlayRef?.overlayElement.contains(<any>ev.target)) {
  //       this.dropdown.isOpen$.pipe(take(1)).subscribe((isOpen) => {
  //         if (isOpen && !this.dropdown.hasBackdrop && this.dropdown.closeOnClickOutside) {
  //           this.dropdown.isOpen$.next(false);
  //         }
  //       });
  //     }
  //   }
  // }

}
