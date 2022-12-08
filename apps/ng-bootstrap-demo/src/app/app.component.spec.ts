import { JsonPipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, ContentChildren, Directive, ElementRef, EventEmitter, Input, Output, QueryList } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
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
        BsNavbarBrandMockComponent,

        // Mock pages
        PageAbcComponent
      ],
      providers: [
        { provide: JsonPipe, useClass: JsonPipe },
        { provide: 'BOOTSTRAP_VERSION', useValue: '0.0.0' }
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});

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
  selector: 'bs-navbar-brand',
  template: 'navbar-brand'
})
class BsNavbarBrandMockComponent { }