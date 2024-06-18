import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsNavigationLockModule } from '@mintplayer/ng-bootstrap/navigation-lock';

import { NavigationLockComponent } from './navigation-lock.component';
import { FormsModule } from '@angular/forms';

describe('NavigationLockComponent', () => {
  let component: NavigationLockComponent;
  let fixture: ComponentFixture<NavigationLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsToggleButtonComponent),
        MockModule(BsNavigationLockModule),
      ],
      declarations: [
        // Unit to test
        NavigationLockComponent
      ]
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
