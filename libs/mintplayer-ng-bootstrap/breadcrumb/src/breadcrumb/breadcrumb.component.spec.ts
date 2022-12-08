import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsBreadcrumbComponent } from './breadcrumb.component';

describe('BsBreadcrumbComponent', () => {
  let component: BsBreadcrumbComponent;
  let fixture: ComponentFixture<BsBreadcrumbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsBreadcrumbComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsBreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
