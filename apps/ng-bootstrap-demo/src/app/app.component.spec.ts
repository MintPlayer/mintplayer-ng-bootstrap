import { OverlayModule } from '@angular/cdk/overlay';
import { JsonPipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, ContentChildren, Directive, ElementRef, EventEmitter, Input, Output, QueryList } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        OverlayModule,
        HttpClientModule,
        RouterTestingModule.withRoutes([
          { path: 'a/b/c', component: PageAbcComponent }
        ]),
      ],
      declarations: [
        // Component to test
        AppComponent,
      
        // Mock components
        BsNavbarMockComponent,
        BsNavbarNavMockComponent,
        BsNavbarDropdownMockComponent,
        BsNavbarItemMockComponent,
        NavbarContentMockDirective,
        BsScrollspyMockComponent,
        BsScrollspyMockDirective,
        BsSelect2MockComponent,
        BsTypeaheadMockComponent,
        BsProgressMockComponent,
        BsProgressbarMockComponent,
        BsFileUploadMockComponent,

        // Mock pages
        PageAbcComponent
      ],
      providers: [
        { provide: JsonPipe, useClass: JsonPipe },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});

enum Color {
  primary,
  secondary,
  success,
  danger,
  warning,
  info,
  light,
  dark,
  body,
  white,
  transparent
}

@Component({
  selector: 'a-b-c',
  template: 'Page ABC'
})
class PageAbcComponent {
}

@Component({
  selector: 'bs-navbar',
  template: 'navbar works'
})
class BsNavbarMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-navbar-nav',
  template: 'navbar-nav works'
})
class BsNavbarNavMockComponent {
  constructor() {
  }

  @Input() collapse!: boolean;
}

@Component({
  selector: 'bs-navbar-dropdown',
  template: 'navbar-dropdown works'
})
class BsNavbarDropdownMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-navbar-item',
  template: 'navbar-item works'
})
class BsNavbarItemMockComponent {
  constructor() {
  }

  // @ContentChildren(BsNavbarDropdownMockComponent) dropdowns!: QueryList<BsNavbarDropdownMockComponent>;
}

@Directive({
  selector: '[navbarContent]'
})
class NavbarContentMockDirective {
  constructor() {
  }
  
  @Input('navbarContent') navbar!: BsNavbarMockComponent;
}

@Component({
  selector: 'bs-file-upload',
  template: `file-upload works`
})
class BsFileUploadMockComponent {
  @Input() files!: any[];
}

@Directive({
  selector: '[bsScrollspy]'
})
class BsScrollspyMockDirective {
  constructor(element: ElementRef) {
    this.element = element;
  }

  element: ElementRef;
}

@Component({
  selector: 'bs-scrollspy',
  template: `
    <div>
      <ng-content></ng-content>
    </div>`
})
class BsScrollspyMockComponent {
  @Input() animation: 'slide' | 'fade' = 'slide';

  @ContentChildren(BsScrollspyMockDirective, { descendants: true })
  directives!: QueryList<BsScrollspyMockDirective>;
}

@Component({
  selector: 'bs-typeahead',
  template: 'typeahead'
})
class BsTypeaheadMockComponent {
  @Input() searchterm = '';
  @Output() searchtermChange = new EventEmitter<string>();
  @Output() public provideSuggestions = new EventEmitter<string>();
  @Input() suggestions: any[] = [];
  @Output() submitted = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<any>();
}

@Component({
  selector: 'bs-progress',
  template: 'progress'
})
class BsProgressMockComponent {
  @Input() public height = 30;
  @Input() public isIndeterminate = false;
}

@Component({
  selector: 'bs-progress-bar',
  template: 'progressbar'
})
class BsProgressbarMockComponent {
  @Input() public minimum = 0;
  @Input() public maximum = 100;
  @Input() public value = 50;
  @Input() public color = Color;
  @Input() public striped = false;
  @Input() public animated = false;
}

@Component({
  selector: 'bs-select2',
  template: 'select2'
})
class BsSelect2MockComponent {
  @Input() public selectedItems: any[] = [];
  @Input() public suggestions: any[] = [];
}
