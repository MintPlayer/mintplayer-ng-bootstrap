import { Component, ContentChildren, Directive, Input, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Component to test
        AppComponent,
      
        // Mock components
        BsNavbarComponent,
        BsNavbarNavComponent,
        BsNavbarItemComponent,
        BsNavbarDropdownComponent,
        BsNavbarContentDirective,
        // BsAlertComponent,
        // BsAlertCloseComponent,
        // BsCardComponent,
        // BsCardHeaderComponent,
        // BsListGroupComponent,
        // BsListGroupItemComponent,
        // BsCalendarComponent,
        // BsAccordionComponent,
        // BsAccordionTabComponent,
        // BsAccordionTabHeaderComponent,
        // BsTabControlComponent,
        // BsTabPageComponent,
      ],
      imports: [
        RouterTestingModule
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // it(`should have as title 'ng-bootstrap-demo'`, () => {
  //   fixture = TestBed.createComponent(AppComponent);
  //   fixture.detectChanges();
    
  //   const app = fixture.componentInstance;
  //   expect(app.title).toEqual('ng-bootstrap-demo');
  // });

  // it('should render title', () => {
  //   fixture = TestBed.createComponent(AppComponent);
  //   fixture.detectChanges();
    
  //   const compiled = fixture.nativeElement as HTMLElement;
  //   expect(compiled.querySelector('h1')?.textContent).toContain(
  //     'Welcome to ng-bootstrap-demo!'
  //   );
  // });
});

// enum Color {
//   primary,
//   secondary,
//   success,
//   danger,
//   warning,
//   info,
//   light,
//   dark,
//   body,
//   white,
//   transparent
// }

@Component({
  selector: 'bs-navbar',
  template: 'navbar works'
})
// class BsNavbarMockComponent {
class BsNavbarComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-navbar-nav',
  template: 'navbar-nav works'
})
// class BsNavbarNavMockComponent {
class BsNavbarNavComponent {
  constructor() {
  }

  @Input() collapse: boolean = false;
}

@Component({
  selector: 'bs-navbar-dropdown',
  template: 'navbar-dropdown works'
})
//class BsNavbarDropdownMockComponent {
class BsNavbarDropdownComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-navbar-item',
  template: 'navbar-item works'
})
// class BsNavbarItemMockComponent {
class BsNavbarItemComponent {
  constructor() {
  }

  // @ContentChildren(BsNavbarDropdownComponent) dropdowns!: QueryList<BsNavbarDropdownComponent>;
}

@Directive({
  selector: '[navbarContent]'
})
// class BsNavbarContentMockDirective {
class BsNavbarContentDirective {

  @Input('navbarContent') navbar!: BsNavbarComponent;

}


// @Component({
//   selector: 'bs-alert',
//   template: 'alert works'
// })
// // class BsAlertMockComponent {
// class BsAlertComponent {
//   constructor() {
//   }
  
//   @Input() public type: Color = Color.primary;
// }

// @Component({
//   selector: 'bs-alert-close',
//   template: 'alert-close works'
// })
// // class BsAlertCloseMockComponent {
// class BsAlertCloseComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-card',
//   template: 'card works'
// })
// // class BsCardMockComponent {
// class BsCardComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-card-header',
//   template: 'card-header works'
// })
// // class BsCardHeaderMockComponent {
// class BsCardHeaderComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-list-group',
//   template: 'list-group works'
// })
// // class BsListGroupMockComponent {
// class BsListGroupComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-list-group-item',
//   template: 'list-group-item works'
// })
// // class BsListGroupItemMockComponent {
// class BsListGroupItemComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-calendar',
//   template: 'calendar works'
// })
// // class BsCalendarMockComponent {
// class BsCalendarComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-accordion',
//   template: 'accordion works'
// })
// // class BsAccordionMockComponent {
// class BsAccordionComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-accordion-tab',
//   template: 'accordion-tab works'
// })
// // class BsAccordionTabMockComponent {
// class BsAccordionTabComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-accordion-tab-header',
//   template: 'accordion-tab-header works'
// })
// // class BsAccordionTabHeaderMockComponent {
// class BsAccordionTabHeaderComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-tab-control',
//   template: 'tab-control works'
// })
// // class BsTabControlMockComponent {
// class BsTabControlComponent {
//   constructor() {
//   }
// }

// @Component({
//   selector: 'bs-tab-page',
//   template: 'tab-page works'
// })
// // class BsTabPageMockComponent {
// class BsTabPageComponent {
//   constructor() {
//   }
  
//   @Input() disabled: boolean = false;
// }