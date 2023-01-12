import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavigationLockComponent } from './navigation-lock.component';

describe('NavigationLockComponent', () => {
  let component: NavigationLockComponent;
  let fixture: ComponentFixture<NavigationLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NavigationLockComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavigationLockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
