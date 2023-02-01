import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsBreadcrumbModule } from '@mintplayer/ng-bootstrap/breadcrumb';
import { MockModule } from 'ng-mocks';
import { BreadcrumbComponent } from './breadcrumb.component';

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
        MockModule(BsBreadcrumbModule),
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
