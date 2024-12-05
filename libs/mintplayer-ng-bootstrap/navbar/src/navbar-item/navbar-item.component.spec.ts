import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

import { BsNavbarItemComponent } from './navbar-item.component';

describe('BsNavbarItemComponent', () => {
  let component: BsNavbarItemTestComponent;
  let fixture: ComponentFixture<BsNavbarItemTestComponent>;

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
        // Component to test
        BsNavbarItemComponent,

        // Mock components
        BsNavbarMockComponent,
        BsNavbarNavMockComponent,
        BsNavbarDropdownMockComponent,

        // Pages
        PageAComponent,
        PageBCComponent,
      
        // Testbench
        BsNavbarItemTestComponent
      ],
      providers: [
        { provide: BsNavbarDropdownComponent, useClass: BsNavbarDropdownMockComponent }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarItemTestComponent);
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
class BsNavbarItemTestComponent {
}

@Component({
  selector: 'bs-navbar',
  standalone: false,
  template: `
  <nav>
    <div>
      <ng-content></ng-content>
    </div>  
  </nav>`,
  providers: [
    { provide: BsNavbarComponent, useExisting: BsNavbarMockComponent }
  ]
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