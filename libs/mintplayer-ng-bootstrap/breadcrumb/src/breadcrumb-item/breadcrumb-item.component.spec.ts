import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsBreadcrumbItemComponent } from './breadcrumb-item.component';

describe('BsBreadcrumbItemComponent', () => {
  let component: BsBreadcrumbItemComponent;
  let fixture: ComponentFixture<BsBreadcrumbItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsBreadcrumbItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsBreadcrumbItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
