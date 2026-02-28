import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { BsNavbarComponent } from './navbar.component';
import { MockComponent } from 'ng-mocks';
import { BsContainerComponent } from '@mintplayer/ng-bootstrap/container';

describe('BsNavbarComponent', () => {
  let component: BsNavbarComponent;
  let fixture: ComponentFixture<BsNavbarComponent>;

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
        MockComponent(BsContainerComponent),
        // Component to test
        BsNavbarComponent,
        BsNavbarNavMockComponent,
        BsNavbarDropdownMockComponent,
        BsNavbarItemMockComponent,

        // Pages
        PageAComponent,
        PageBCComponent,

        // Testbench
        BsNavbarTestComponent,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-navbar-test',
  standalone: true,
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
class BsNavbarTestComponent {
}

@Component({
  selector: 'bs-navbar-nav',
  standalone: true,
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
  standalone: true,
  template: `
    <ul>
      <ng-content></ng-content>
    </ul>`
})
class BsNavbarDropdownMockComponent {
}

@Component({
  selector: 'bs-navbar-item',
  standalone: true,
  template: `
    <li>
      <ng-content></ng-content>
    </li>`
})
class BsNavbarItemMockComponent {
}

@Component({
  selector: 'page-a',
  standalone: true,
  template: `<div>Page A</div>`
})
class PageAComponent {
}

@Component({
  selector: 'page-bc',
  standalone: true,
  template: `<div>Page B - C</div>`
})
class PageBCComponent {
}