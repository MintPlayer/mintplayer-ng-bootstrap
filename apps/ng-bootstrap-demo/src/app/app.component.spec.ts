import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([])
      ],
      declarations: [
        // Component to test
        AppComponent,
      
        // Mock components
        BsNavbarDropdownMockComponent,
        BsNavbarItemMockComponent,
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
});

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