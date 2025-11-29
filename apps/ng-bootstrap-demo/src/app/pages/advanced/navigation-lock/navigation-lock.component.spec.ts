import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MockModule } from 'ng-mocks';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsNavigationLockModule } from '@mintplayer/ng-bootstrap/navigation-lock';

import { NavigationLockComponent } from './navigation-lock.component';

describe('NavigationLockComponent', () => {
  let component: NavigationLockComponent;
  let fixture: ComponentFixture<NavigationLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        FormsModule,
        MockModule(BsToggleButtonModule),
        MockModule(BsNavigationLockModule),
        NavigationLockComponent,
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
