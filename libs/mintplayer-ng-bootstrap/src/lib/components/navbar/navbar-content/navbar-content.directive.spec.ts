import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NavbarContentDirective } from './navbar-content.directive';

describe('DropdownToggleDirective', () => {
  let component: BsNavbarContentTestComponent;
  let fixture: ComponentFixture<BsNavbarContentTestComponent>;

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
        NavbarContentDirective,

        // Mock components
        BsNavbarMockComponent,
        BsNavbarNavMockComponent,
        BsNavbarDropdownMockComponent,
        BsNavbarItemMockComponent,

        // Pages
        PageAComponent,
        PageBCComponent,

        // Testbench
        BsNavbarContentTestComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarContentTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-navbar-test',
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
class BsNavbarContentTestComponent {
}

@Component({
  selector: 'bs-navbar',
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
  template: `
  <ul>
    <ng-content></ng-content>
</ul>`
})
class BsNavbarDropdownMockComponent {
}

@Component({
  selector: 'bs-navbar-item',
  template: `
  <li>
    <ng-content></ng-content>
</li>`
})
class BsNavbarItemMockComponent {
}

@Component({
  selector: 'page-a',
  template: `
  <div>Page A</div>`
})
class PageAComponent {
}

@Component({
  selector: 'page-bc',
  template: `
  <div>Page B - C</div>`
})
class PageBCComponent {
}