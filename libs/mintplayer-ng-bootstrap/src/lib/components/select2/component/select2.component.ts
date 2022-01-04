import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'bs-select2',
  templateUrl: './select2.component.html',
  styleUrls: ['./select2.component.scss']
})
export class BsSelect2Component implements OnInit, AfterViewInit {

  isOpen = false;
  
  suggestions$ = new BehaviorSubject<any[]>([]);
  isLoading$ = new BehaviorSubject<boolean>(false);
  hostWidth$ = new BehaviorSubject<number>(200);

  @ViewChild('searchBox') searchBox!: ElementRef<HTMLInputElement>;
  @ViewChild('itemsBox') itemsBox!: ElementRef<HTMLDivElement>;
  @Input() searchterm = '';
  @Input() public suggestions: any[] = [];
  @Output() public provideSuggestions = new EventEmitter<string>();
  @Input() selectedItems: any[] = [];
  @HostBinding('class.focus') isFocused = false;

  private charWidth = 10;
  searchWidth = 20;

  constructor() { }

  ngAfterViewInit() {
    this.onResize();
  }
  
  onProvideSuggestions(value: string) {
    this.searchWidth = this.charWidth * (this.searchterm.length + 2);
    if (value === '') {
      this.isOpen = false;
      this.suggestions$.next([]);
    } else {
      this.isLoading$.next(true);
      this.isOpen = true;
      this.provideSuggestions.emit(value);
    }
  }
  onSuggestionClicked(suggestion: any) {
    this.searchterm = '';
    this.isOpen = false;

    const existing = this.selectedItems.find((value, index) => value.id === suggestion.id);
    if (existing === undefined) {
      this.selectedItems.push(suggestion);
    } else {
      this.selectedItems.splice(this.selectedItems.indexOf(existing), 1);
    }

    this.searchBox.nativeElement.focus();
  }
  onRemoveItem(item: any, event: MouseEvent) {
    event.stopPropagation();
    this.selectedItems.splice(this.selectedItems.indexOf(item), 1);
    this.focus();
  }

  ngOnInit(): void {
  }

  @HostListener('window:resize')
  onResize() {
    this.hostWidth$.next(this.itemsBox.nativeElement.offsetWidth);
  }

  @HostListener('click')
  public focus() {
    this.searchBox.nativeElement.focus();
  }
  
  @ViewChild('defaultItemTemplate', { static: true }) defaultItemTemplate!: TemplateRef<any>;
  itemTemplate?: TemplateRef<any>;


}
