import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

import { BsNavbarItemComponent } from './navbar-item.component';

describe('BsNavbarItemComponent', () => {
  let component: BsNavbarItemTestComponent;
  let fixture: ComponentFixture<BsNavbarItemTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([])
      ],
      declarations: [
        // Component to test
        BsNavbarItemComponent,

        // Mock components
        BsNavbarDropdownMockComponent,
      
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
  template: `
  <bs-navbar>
    <bs-navbar-nav>
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
  selector: 'bs-navbar-dropdown',
  template: `
  <ul>
    <ng-content></ng-content>
</ul>`
})
class BsNavbarDropdownMockComponent {
}