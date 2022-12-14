import { Component, ContentChildren, forwardRef, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsNavbarBrandMockComponent, BsNavbarDropdownMockComponent, BsNavbarItemMockComponent, BsNavbarMockComponent, BsNavbarNavMockComponent, NavbarContentMockDirective } from '@mintplayer/ng-bootstrap/testing';
import { DropdownToggleDirective } from './dropdown-toggle.directive';

describe('DropdownToggleDirective', () => {
  let component: BsDropdownToggleTestComponent;
  let fixture: ComponentFixture<BsDropdownToggleTestComponent>;

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
        DropdownToggleDirective,

        // Mock components
        BsNavbarMockComponent,
        BsNavbarNavMockComponent,
        BsNavbarDropdownMockComponent,
        BsNavbarItemMockComponent,
        NavbarContentMockDirective,
        BsNavbarBrandMockComponent,

        // Pages
        PageAComponent,
        PageBCComponent,

        // Testbench
        BsDropdownToggleTestComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDropdownToggleTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-dropdown-toggle-test',
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
class BsDropdownToggleTestComponent {
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