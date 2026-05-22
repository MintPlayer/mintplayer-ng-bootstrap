import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavigationLockMasterDetailComponent } from './navigation-lock-master-detail.component';

describe('NavigationLockMasterDetailComponent', () => {
  let component: NavigationLockMasterDetailComponent;
  let fixture: ComponentFixture<NavigationLockMasterDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test (standalone)
        NavigationLockMasterDetailComponent,
      ],
      providers: [
        provideRouter([]),
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavigationLockMasterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
