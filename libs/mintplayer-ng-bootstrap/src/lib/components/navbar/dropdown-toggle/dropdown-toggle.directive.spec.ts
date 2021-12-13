import { Component, ContentChildren, forwardRef, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';
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

        // Pages
        PageAComponent,
        PageBCComponent,

        // Testbench
        BsDropdownToggleTestComponent,
      ],
      // providers: [
      //   // { provide: BsNavbarItemComponent, useClass: BsNavbarItemMockComponent },
      //   //{ provide: BsNavbarDropdownComponent, useClass: BsNavbarDropdownMockComponent }
      // ]
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
  </ul>`,
  providers: [
    { provide: BsNavbarDropdownComponent, useExisting: BsNavbarDropdownMockComponent }
  ]
})
class BsNavbarDropdownMockComponent {
}

@Component({
  selector: 'bs-navbar-item',
  template: `
  <li>
    <ng-content></ng-content>
  </li>`,
  providers: [
    { provide: BsNavbarItemComponent, useExisting: BsNavbarItemMockComponent }
  ]
})
class BsNavbarItemMockComponent {
  @ContentChildren(forwardRef(() => BsNavbarDropdownMockComponent)) dropdowns!: QueryList<BsNavbarDropdownMockComponent>;
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