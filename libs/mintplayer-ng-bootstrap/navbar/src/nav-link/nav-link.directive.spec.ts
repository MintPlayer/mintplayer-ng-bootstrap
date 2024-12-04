import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';
import { NavLinkDirective } from './nav-link.directive';

describe('NavLinkDirective', () => {
  let component: BsNavLinkTestComponent;
  let fixture: ComponentFixture<BsNavLinkTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'a', component: PageAComponent },
          { path: 'b', children: [
            { path: 'c', component: PageBCComponent }
          ]}
        ])
      ],
      declarations: [
        // Directive to test
        NavLinkDirective,

        // Mock components
        BsNavbarMockComponent,
        BsNavbarNavMockComponent,
        BsNavbarDropdownMockComponent,
        BsNavbarItemMockComponent,

        // Pages
        PageAComponent,
        PageBCComponent,

        // Testbench
        BsNavLinkTestComponent,
      ],
      providers: [
        { provide: BsNavbarDropdownComponent, useClass: BsNavbarDropdownMockComponent }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavLinkTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-nav-link-test',
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
class BsNavLinkTestComponent {
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
  selector: 'bs-navbar-nav',
  standalone: false,
  template: `
    <div>
      <ul>
        <ng-content></ng-content>
      </ul>  
    </div>`
})
class BsNavbarNavMockComponent {
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
class BsNavbarItemMockComponent {
}

@Component({
  selector: 'page-a',
  standalone: false,
  template: `<div>Page A</div>`
})
class PageAComponent {
}

@Component({
  selector: 'page-bc',
  standalone: false,
  template: `<div>Page B - C</div>`
})
class PageBCComponent {
}