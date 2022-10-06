import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BreadcrumbComponent } from './breadcrumb.component';

@Component({
  selector: 'bs-breadcrumb',
  template: `
    <ul>
      <ng-content></ng-content>
    </ul>`
})
class BsBreadcrumbMockComponent { }

@Component({
  selector: 'bs-breadcrumb-item',
  template: `
    <li>
      <ng-content></ng-content>
    </li>`
})
class BsBreadcrumbItemMockComponent { }

@Component({
  selector: 'page-home',
  template: 'Home'
})
class PageHomeComponent { }

@Component({
  selector: 'page-basic',
  template: 'Basic'
})
class PageBasicComponent { }

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: '', component: PageHomeComponent },
          { path: 'basic', component: PageBasicComponent, children: [] }
        ])
      ],
      declarations: [
        // Unit to test
        BreadcrumbComponent,

        // Pages
        PageHomeComponent,
        PageBasicComponent,
      
        // Mock dependencies
        BsBreadcrumbMockComponent,
        BsBreadcrumbItemMockComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
