import { HttpClientModule } from '@angular/common/http';
import { Component, ContentChildren, Directive, ElementRef, EventEmitter, Input, Output, QueryList } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { BASE_URL } from '@mintplayer/ng-base-url';
import { DatatableSettings } from '@mintplayer/ng-bootstrap';
import { API_VERSION } from '@mintplayer/ng-client';
import { PaginationResponse } from '@mintplayer/ng-pagination';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
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
        BsCarouselMockComponent,
        BsAlertMockComponent,
        BsAlertCloseMockComponent,
        BsCardMockComponent,
        BsCardHeaderMockComponent,
        BsListGroupMockComponent,
        BsListGroupItemMockComponent,
        BsCalendarMockComponent,
        BsAccordionMockComponent,
        BsAccordionTabMockComponent,
        BsAccordionTabHeaderMockComponent,
        BsTabControlMockComponent,
        BsTabPageMockComponent,
        BsScrollspyMockComponent,
        BsScrollspyMockDirective,
        BsDatatableMockComponent,
        BsDatatableColumnDirective,
        BsDatepickerMockComponent,
        BsMultiselectComponent,
        BsDropdownMockDirective,

        // Mock pages
        PageAbcComponent
      ],
      providers: [
        { provide: BASE_URL, useValue: 'https://mintplayer.com' },
        { provide: API_VERSION, useValue: 'v3' }
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'ng-bootstrap-demo'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('ng-bootstrap-demo');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Welcome to ng-bootstrap-demo!'
    );
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
  selector: 'bs-carousel',
  template: 'carousel works'
})
class BsCarouselMockComponent {

  @Input() public animation: 'fade' | 'slide' = 'slide';

}

@Component({
  selector: 'bs-alert',
  template: 'alert works'
})
class BsAlertMockComponent {
  constructor() {
  }
  
  @Input() public type: Color = Color.primary;
}

@Component({
  selector: 'bs-alert-close',
  template: 'alert-close works'
})
class BsAlertCloseMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-card',
  template: 'card works'
})
class BsCardMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-card-header',
  template: 'card-header works'
})
class BsCardHeaderMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-list-group',
  template: 'list-group works'
})
class BsListGroupMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-list-group-item',
  template: 'list-group-item works'
})
class BsListGroupItemMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-calendar',
  template: 'calendar works'
})
class BsCalendarMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-accordion',
  template: 'accordion works'
})
class BsAccordionMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-accordion-tab',
  template: 'accordion-tab works'
})
class BsAccordionTabMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-accordion-tab-header',
  template: 'accordion-tab-header works'
})
class BsAccordionTabHeaderMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-tab-control',
  template: 'tab-control works'
})
class BsTabControlMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-tab-page',
  template: 'tab-page works'
})
class BsTabPageMockComponent {
  constructor() {
  }
  
  @Input() disabled: boolean = false;
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
  selector: 'bs-datatable',
  template: ``
})
class BsDatatableMockComponent {

  constructor() {
    this.settings = new DatatableSettings();
    this.settings.sortProperty = '';
    this.settings.sortDirection = 'ascending';
    this.settings.perPage = { values: [10, 20, 50], selected: 20 };
    this.settings.page = { values: [1], selected: 1 };
  }

  @Input() settings: DatatableSettings;
  @Input() data?: PaginationResponse<any>;
  @Output() onReloadData: EventEmitter<any> = new EventEmitter();

}

@Directive({
  selector: '[bsDatatableColumn]'
})
class BsDatatableColumnDirective {
  @Input() public bsDatatableColumn: DatatableColumnMetadata = { name: '', sortable: true };
}

interface DatatableColumnMetadata {
  name: string;
  sortable: boolean;
}

@Component({
  selector: 'bs-datepicker',
  template: 'Date picker'
})
class BsDatepickerMockComponent {
}

@Component({
  selector: 'bs-multiselect',
  template: 'multiselect'
})
class BsMultiselectComponent {

  @Input() public items: any[] = [];
  @Input() public selectedItems: any[] = [];

}

@Directive({
  selector: '[bsDropdown]'
})
class BsDropdownMockDirective {
  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
}
