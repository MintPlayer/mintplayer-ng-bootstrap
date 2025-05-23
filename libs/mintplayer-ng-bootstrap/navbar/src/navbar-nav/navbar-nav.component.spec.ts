import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsNavbarComponent } from '../navbar/navbar.component';

import { BsNavbarNavComponent } from './navbar-nav.component';

describe('BsNavbarNavComponent', () => {
  let component: BsNavbarNavTestComponent;
  let fixture: ComponentFixture<BsNavbarNavTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule.withRoutes([
          { path: 'a', component: PageAComponent },
          { path: 'b', children: [
            { path: 'c', component: PageBCComponent }
          ]}
        ]),
        
        // Pages
        PageAComponent,
        PageBCComponent,
        
      ],
      declarations: [
        // Component to test
        BsNavbarNavComponent,

        // Mock components
        BsNavbarMockComponent,
        BsNavbarDropdownMockComponent,
        BsNavbarItemMockComponent,

        // Testbench
        BsNavbarNavTestComponent
      ],
      providers: [
        { provide: BsNavbarComponent, useClass: BsNavbarMockComponent }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarNavTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-navbar-test',
  standalone: false,
  template: `
  <bs-navbar>
    <bs-navbar-nav>
      <bs-navbar-item>
        <a [routerLink]='["/a"]'>a</a>
      </bs-navbar-item>
      <bs-navbar-item>
        <a [routerLink]='[]'>dropdown</a>
        <bs-navbar-dropdown>
          <bs-navbar-item>
            <a [routerLink]='["/b", "c"]'>bc</a>
          </bs-navbar-item>
        </bs-navbar-dropdown>
      </bs-navbar-item>
    </bs-navbar-nav>
  </bs-navbar>`
})
class BsNavbarNavTestComponent {
}

@Component({
  selector: 'bs-navbar',
  standalone: false,
  template: `
    <nav>
      <div>
        <ng-content></ng-content>
      </div>  
    </nav>`
})
class BsNavbarMockComponent {
}

@Component({
  selector: 'bs-navbar-dropdown',
  standalone: false,
  template: `
    <ul>
      <ng-content></ng-content>
    </ul>`
})
class BsNavbarDropdownMockComponent {
}

@Component({
  selector: 'bs-navbar-item',
  standalone: false,
  template: `
    <li>
      <ng-content></ng-content>
    </li>`
})
class BsNavbarItemMockComponent {}

@Component({
  selector: 'page-a',
  standalone: true,
  template: `<div>Page A</div>`
})
class PageAComponent {}

@Component({
  selector: 'page-bc',
  standalone: true,
  template: `<div>Page B - C</div>`
})
class PageBCComponent {}